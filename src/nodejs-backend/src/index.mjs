/**
 * HTTP replacement for the Motoko backend canister (bookings + access control).
 * Optional PostgreSQL when DATABASE_URL or DB_HOST+DB_NAME is set; otherwise in-memory Maps.
 */

import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Principal } from "@icp-sdk/core/principal";

dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});
import cors from "cors";
import express from "express";
import { attachCatalogMediaRoutes } from "./catalog-media-upload.mjs";
import { attachCatalogRoutes } from "./catalog-api.mjs";
import { dbListAllBookings, dbInsertBooking, dbListBookingsByEmail, dbUpdateBookingStatus } from "./db/bookings.mjs";
import { runMigrations } from "./db/migrate.mjs";
import { createPoolFromEnv, isDatabaseEnabled } from "./db/pool.mjs";
import {
  dbGetUserRow,
  dbSaveProfile,
  dbSetRoleOnly,
} from "./db/users.mjs";
import { attachAdminLocalAuthRoutes } from "./admin-local-auth-routes.mjs";
import { attachUserLocalAuthRoutes } from "./user-local-auth-routes.mjs";
import { verifyAdminToken, verifyUserToken } from "./admin-local-jwt.mjs";
import { createMemoryCatalogStore } from "./catalog-store-memory.mjs";
import { createPgCatalogStore } from "./catalog-store-pg.mjs";

const PORT = Number(process.env.PORT || 4944);
const ANONYMOUS_TEXT = Principal.anonymous().toText();
const DEV_ADMIN_TOKEN = "dev-admin";

function effectiveAdminToken() {
  const fromEnv = process.env.APP_ADMIN_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return DEV_ADMIN_TOKEN;
}

function usingBuiltinDevAdminSecret() {
  return effectiveAdminToken().trim() === DEV_ADMIN_TOKEN;
}

function isAnonymousPrincipal(p) {
  if (p === ANONYMOUS_TEXT) return true;
  try {
    return Principal.fromText(p).isAnonymous();
  } catch {
    return false;
  }
}

function trustAdminTokenHeader() {
  if (process.env.TOURIST_TRUST_ADMIN_TOKEN_HEADER === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  if (!process.env.APP_ADMIN_TOKEN?.trim()) return true;
  if (usingBuiltinDevAdminSecret()) return true;
  return false;
}

function bookingToJson(b) {
  const out = {
    customerName: b.customerName,
    packageName: b.packageName,
    status: b.status,
    bookingId: String(b.bookingId),
    customerPhone: b.customerPhone,
    packageCategory: b.packageCategory,
    addOns: b.addOns,
    createdTimestamp: String(b.createdTimestamp),
    travelDate: b.travelDate,
    groupSize: String(b.groupSize),
    customerEmail: b.customerEmail,
    totalPriceINR: String(b.totalPriceINR),
    catalogPackageId: String(b.catalogPackageId ?? 0),
  };
  if (b.catalogBatchId != null) {
    out.catalogBatchId = String(b.catalogBatchId);
  }
  if (b.catalogTierIndex != null) {
    out.catalogTierIndex = String(b.catalogTierIndex);
  }
  return out;
}

function parseBookingStatus(s) {
  if (s === "pending" || s === "confirmed" || s === "cancelled") return s;
  throw new Error("Invalid booking status");
}

function parseUserRole(s) {
  if (s === "admin" || s === "user" || s === "guest") return s;
  throw new Error("Invalid user role");
}

function principalHeader(req, res) {
  const raw = req.headers["x-ic-principal"];
  if (typeof raw !== "string" || !raw.trim()) {
    res.status(400).json({ error: "Missing X-IC-Principal header" });
    return null;
  }
  return raw.trim();
}

const app = express();
app.use(
  cors({
    allowedHeaders: [
      "Content-Type",
      "X-IC-Principal",
      "X-App-Admin-Token",
      "Authorization",
    ],
  }),
);
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (req.method === "OPTIONS") return next();
  // <img src=".../catalog-media/..."> cannot send X-IC-Principal; uploads stay POST + admin-only.
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    req.path.startsWith("/catalog-media/")
  ) {
    req.callerPrincipal = ANONYMOUS_TEXT;
    return next();
  }
  if (req.method === "GET" && req.path === "/favicon.ico") {
    res.status(204).end();
    return;
  }
  if (req.method === "GET" && req.path === "/") {
    res
      .type("text/plain")
      .send(
        "tourist-node-api: JSON API only. Open the Vite dev app (e.g. http://localhost:5007), not this port.",
      );
    return;
  }
  if (
    req.method === "POST" &&
    (req.path === "/admin-auth/register" ||
      req.path === "/admin-auth/login" ||
      req.path === "/admin-auth/send-registration-otp" ||
      req.path === "/user-auth/register" ||
      req.path === "/user-auth/login" ||
      req.path === "/user-auth/send-registration-otp")
  ) {
    return next();
  }

  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) {
      const adminSession = verifyAdminToken(token);
      if (adminSession) {
        req.localAdminSession = {
          userId: adminSession.sub,
          username: adminSession.un,
        };
        req.localUserSession = undefined;
        req.callerPrincipal = ANONYMOUS_TEXT;
        return next();
      }
      const userSession = verifyUserToken(token);
      if (userSession) {
        req.localUserSession = {
          userId: userSession.sub,
          username: userSession.un,
        };
        req.localAdminSession = undefined;
        req.callerPrincipal = `local-user:${userSession.sub}`;
        return next();
      }
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
  }

  const p = principalHeader(req, res);
  if (p === null) return;
  req.callerPrincipal = p;
  next();
});

app.get("/health", async (_req, res) => {
  try {
    const pool = app.locals.pgPool;
    if (pool) {
      await pool.query("SELECT 1");
      res.json({ ok: true, database: "postgresql" });
      return;
    }
    res.json({ ok: true, database: "memory" });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e.message || e) });
  }
});

async function bootstrap() {
  /** @type {import('pg').Pool | null} */
  let pool = null;
  if (isDatabaseEnabled()) {
    pool = createPoolFromEnv();
    await runMigrations(pool);
    console.log("[tourist-node-api] PostgreSQL connected and migrated.");
  }
  app.locals.pgPool = pool;

  const memoryAdmins = {
    /** @type {Map<string, { id: number, username: string, passwordHash: string }>} */
    users: new Map(),
    nextId: 1,
  };

  /** @type {Map<string, { otpHash: string, expiresAtMs: number }>} */
  const registrationOtpMemory = new Map();
  /** @type {Map<string, number>} */
  const registrationOtpRateMs = new Map();

  attachAdminLocalAuthRoutes(app, {
    pool,
    memoryAdmins,
    registrationOtpMemory,
    registrationOtpRateMs,
    effectiveAdminToken,
  });

  const memoryLocalUsers = {
    /** @type {Map<string, { id: number, username: string, passwordHash: string }>} */
    users: new Map(),
    nextId: 1,
  };
  /** @type {Map<string, { otpHash: string, expiresAtMs: number }>} */
  const userRegistrationOtpMemory = new Map();
  /** @type {Map<string, number>} */
  const userRegistrationOtpRateMs = new Map();

  const catalog = pool
    ? createPgCatalogStore(pool)
    : createMemoryCatalogStore();
  await catalog.seedIfEmpty();

  /** @type {Map<string, 'admin' | 'user' | 'guest'>} */
  const userRoles = new Map();
  /** @type {Map<number, object>} */
  const bookings = new Map();
  /** @type {Map<string, number[]>} */
  const bookingsByEmail = new Map();
  let nextBookingId = 1;
  /** @type {Map<string, { name: string, email: string, phone: string }>} */
  const userProfiles = new Map();

  attachUserLocalAuthRoutes(app, {
    pool,
    memoryUsers: memoryLocalUsers,
    userRegistrationOtpMemory,
    userRegistrationOtpRateMs,
    userProfilesMemory: userProfiles,
    userRolesMemory: userRoles,
    memoryAdmins,
  });

  async function getUserRoleAsync(caller) {
    if (pool) {
      const row = await dbGetUserRow(pool, caller);
      if (row) return row.role;
      if (isAnonymousPrincipal(caller)) return "guest";
      const err = new Error("User is not registered");
      err.code = "NOT_REGISTERED";
      throw err;
    }
    const assigned = userRoles.get(caller);
    if (assigned !== undefined) return assigned;
    if (isAnonymousPrincipal(caller)) return "guest";
    const err = new Error("User is not registered");
    err.code = "NOT_REGISTERED";
    throw err;
  }

  async function hasPermissionAsync(caller, required) {
    const userRole = await getUserRoleAsync(caller);
    if (userRole === "admin" || required === "guest") return true;
    return userRole === required;
  }

  async function isAdminAsync(caller) {
    try {
      return (await getUserRoleAsync(caller)) === "admin";
    } catch (e) {
      if (e && e.code === "NOT_REGISTERED") return false;
      throw e;
    }
  }

  async function isAdminRequest(req) {
    if (req.localAdminSession?.userId != null) return true;
    if (await isAdminAsync(req.callerPrincipal)) return true;
    if (
      process.env.TOURIST_DISABLE_OPEN_II_ADMIN !== "1" &&
      usingBuiltinDevAdminSecret() &&
      !isAnonymousPrincipal(req.callerPrincipal)
    ) {
      return true;
    }
    if (!trustAdminTokenHeader()) return false;
    const raw = req.headers["x-app-admin-token"];
    if (typeof raw !== "string") return false;
    const presented = raw.trim();
    if (!presented) return false;
    return presented === effectiveAdminToken().trim();
  }

  async function getProfileOrThrowAsync(caller) {
    if (pool) {
      const row = await dbGetUserRow(pool, caller);
      if (!row || !row.name || !row.email || !row.phone) {
        const err = new Error("User profile not found. ");
        err.code = "NO_PROFILE";
        throw err;
      }
      return { name: row.name, email: row.email, phone: row.phone };
    }
    const profile = userProfiles.get(caller);
    if (!profile) {
      const err = new Error("User profile not found. ");
      err.code = "NO_PROFILE";
      throw err;
    }
    return profile;
  }

  async function initializeAccessAsync(caller, userSecret) {
    const adminToken = effectiveAdminToken().trim();
    if (!adminToken) {
      const err = new Error("APP_ADMIN_TOKEN environment variable is not set");
      err.code = "NO_ADMIN_TOKEN";
      throw err;
    }
    if (userSecret === adminToken && userSecret !== "") {
      if (pool) await dbSetRoleOnly(pool, caller, "admin");
      else userRoles.set(caller, "admin");
      return;
    }
    if (pool) {
      const row = await dbGetUserRow(pool, caller);
      if (row) return;
      if (isAnonymousPrincipal(caller)) return;
      await dbSetRoleOnly(pool, caller, "user");
      return;
    }
    if (userRoles.has(caller)) return;
    if (isAnonymousPrincipal(caller)) return;
    userRoles.set(caller, "user");
  }

  async function createBookingRecord(booking) {
    if (pool) {
      return dbInsertBooking(pool, booking);
    }
    const id = nextBookingId++;
    const full = { ...booking, bookingId: id };
    bookings.set(id, full);
    const existing = bookingsByEmail.get(booking.customerEmail) ?? [];
    bookingsByEmail.set(booking.customerEmail, [...existing, id]);
    return id;
  }

  app.post("/init-access", async (req, res) => {
    try {
      const body = req.body;
      let secret = "";
      if (typeof body?.secret === "string") secret = body.secret.trim();
      else if (body?.secret != null && body.secret !== "")
        secret = String(body.secret).trim();
      await initializeAccessAsync(req.callerPrincipal, secret);
      res.status(204).end();
    } catch (e) {
      console.error("[tourist-node-api] POST /init-access failed:", e);
      if (e && e.code === "NO_ADMIN_TOKEN") {
        res.status(500).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  app.get("/caller-role", async (req, res) => {
    try {
      const role = await getUserRoleAsync(req.callerPrincipal);
      res.json({ role });
    } catch (e) {
      if (e.code === "NOT_REGISTERED") {
        res.status(400).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/is-admin", async (req, res) => {
    try {
      const ok = await isAdminRequest(req);
      if (
        !ok &&
        usingBuiltinDevAdminSecret() &&
        process.env.TOURIST_DISABLE_OPEN_II_ADMIN !== "1"
      ) {
        const p = req.callerPrincipal ?? "";
        console.warn(
          "[tourist-node-api] /is-admin=false with dev token (expected any non-anonymous II user to pass).",
          "principalLen=",
          p.length,
          "treatsAsAnonymous=",
          isAnonymousPrincipal(p),
        );
      }
      res.json({ isAdmin: ok });
    } catch {
      res.json({ isAdmin: false });
    }
  });

  app.post("/assign-role", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        res.status(403).json({ error: "Unauthorized: Only admins can assign user roles" });
        return;
      }
      const user = req.body?.userPrincipal;
      const role = parseUserRole(req.body?.role);
      if (typeof user !== "string" || !user.trim()) {
        res.status(400).json({ error: "userPrincipal required" });
        return;
      }
      if (pool) await dbSetRoleOnly(pool, user.trim(), role);
      else userRoles.set(user.trim(), role);
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  app.post("/bookings", async (req, res) => {
    try {
      const b = req.body;
      const packageCategory = String(b?.packageCategory ?? "");
      const packageName = String(b?.packageName ?? "");
      const customerName = String(b?.customerName ?? "");
      const customerEmail = String(b?.customerEmail ?? "");
      const customerPhone = String(b?.customerPhone ?? "");
      const travelDate = String(b?.travelDate ?? "");
      const groupSize = Number(b?.groupSize);
      const addOns = Array.isArray(b?.addOns) ? b.addOns.map(String) : [];
      const totalPriceINR = Number(b?.totalPriceINR);

      if (!packageCategory) throw new Error("Package category cannot be empty");
      if (!packageName) throw new Error("Package name cannot be empty");
      if (!customerName) throw new Error("Customer name cannot be empty");
      if (!customerEmail) throw new Error("Customer email cannot be empty");
      if (!customerPhone) throw new Error("Customer phone cannot be empty");
      if (!travelDate) throw new Error("Travel date cannot be empty");
      if (!Number.isFinite(groupSize) || groupSize <= 0) {
        throw new Error("Group size must be greater than 0");
      }
      if (!Number.isFinite(totalPriceINR) || totalPriceINR <= 0) {
        throw new Error("Total price must be greater than 0");
      }

      const createdTimestamp = BigInt(Date.now()) * 1_000_000n;
      const booking = {
        packageCategory,
        packageName,
        customerName,
        customerEmail,
        customerPhone,
        travelDate,
        groupSize: BigInt(groupSize),
        addOns,
        totalPriceINR: BigInt(Math.floor(totalPriceINR)),
        status: "pending",
        createdTimestamp,
        catalogPackageId: 0,
      };
      const bookingId = await createBookingRecord(booking);
      res.json({ bookingId: String(bookingId) });
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  app.get("/bookings/mine", async (req, res) => {
    try {
      if (!(await hasPermissionAsync(req.callerPrincipal, "user"))) {
        res.status(403).json({ error: "Unauthorized: Only users can view their bookings" });
        return;
      }
      const profile = await getProfileOrThrowAsync(req.callerPrincipal);
      let list;
      if (pool) {
        const rows = await dbListBookingsByEmail(pool, profile.email);
        list = rows.map(bookingToJson);
      } else {
        const ids = bookingsByEmail.get(profile.email) ?? [];
        list = ids
          .map((id) => bookings.get(id))
          .filter(Boolean)
          .map(bookingToJson);
      }
      res.json(list);
    } catch (e) {
      if (e.code === "NO_PROFILE" || e.code === "NOT_REGISTERED") {
        res.status(400).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/bookings", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        res.status(403).json({ error: "Unauthorized: Only admins can view all bookings" });
        return;
      }
      if (pool) {
        const rows = await dbListAllBookings(pool);
        res.json(rows.map(bookingToJson));
        return;
      }
      res.json([...bookings.values()].map(bookingToJson));
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.patch("/bookings/:id/status", async (req, res) => {
    try {
      if (!(await isAdminRequest(req))) {
        res.status(403).json({ error: "Unauthorized: Only admins can update booking status" });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: "Invalid booking id" });
        return;
      }
      const newStatus = parseBookingStatus(req.body?.status);
      if (pool) {
        const ok = await dbUpdateBookingStatus(pool, id, newStatus);
        if (!ok) {
          res.status(400).json({ error: "Booking not found. " });
          return;
        }
      } else {
        const booking = bookings.get(id);
        if (!booking) {
          res.status(400).json({ error: "Booking not found. " });
          return;
        }
        bookings.set(id, { ...booking, status: newStatus });
      }
      res.status(204).end();
    } catch (e) {
      res.status(400).json({ error: String(e.message || e) });
    }
  });

  app.put("/profile", async (req, res) => {
    try {
      if (!(await hasPermissionAsync(req.callerPrincipal, "user"))) {
        res.status(403).json({ error: "Unauthorized: Only users can save profiles" });
        return;
      }
      const name = String(req.body?.name ?? "");
      const email = String(req.body?.email ?? "");
      const phone = String(req.body?.phone ?? "");
      if (!name || !email || !phone) {
        res.status(400).json({ error: "Profile fields required" });
        return;
      }
      if (pool) {
        await dbSaveProfile(pool, req.callerPrincipal, { name, email, phone });
        if (
          process.env.NODE_ENV !== "production" &&
          name.trim().toLowerCase() === "admin"
        ) {
          await dbSetRoleOnly(pool, req.callerPrincipal, "admin");
        }
      } else {
        userProfiles.set(req.callerPrincipal, { name, email, phone });
        if (
          process.env.NODE_ENV !== "production" &&
          name.trim().toLowerCase() === "admin"
        ) {
          userRoles.set(req.callerPrincipal, "admin");
        }
      }
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/profile", async (req, res) => {
    try {
      if (!(await hasPermissionAsync(req.callerPrincipal, "user"))) {
        res.status(403).json({ error: "Unauthorized: Only users can view profiles" });
        return;
      }
      res.json(await getProfileOrThrowAsync(req.callerPrincipal));
    } catch (e) {
      if (e.code === "NO_PROFILE" || e.code === "NOT_REGISTERED") {
        res.status(400).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/users/:principal/profile", async (req, res) => {
    try {
      const target = req.params.principal;
      if (req.callerPrincipal !== target && !(await isAdminRequest(req))) {
        res.status(403).json({ error: "Unauthorized: Can only view your own profile" });
        return;
      }
      if (pool) {
        const row = await dbGetUserRow(pool, target);
        if (!row || !row.name) {
          res.status(400).json({ error: "User profile not found. " });
          return;
        }
        res.json({ name: row.name, email: row.email, phone: row.phone });
        return;
      }
      const profile = userProfiles.get(target);
      if (!profile) {
        res.status(400).json({ error: "User profile not found. " });
        return;
      }
      res.json(profile);
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  const catalogUploadDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "data",
    "catalog-uploads",
  );
  const catalogMediaUrlPrefix =
    process.env.CATALOG_MEDIA_URL_PREFIX?.trim() || "/api-node/catalog-media";

  attachCatalogMediaRoutes(app, {
    uploadDir: catalogUploadDir,
    isAdminRequest,
    urlPrefix: catalogMediaUrlPrefix,
  });

  attachCatalogRoutes(app, {
    catalog,
    isAdminRequest,
    createBooking: createBookingRecord,
  });

  app.use((err, req, res, _next) => {
    if (res.headersSent) return;
    if (err && err.name === "MulterError") {
      const code = err.code;
      const msg =
        code === "LIMIT_FILE_SIZE"
          ? "Image too large (max 8 MB)"
          : String(err.message || "Upload failed");
      res.status(400).json({ error: msg });
      return;
    }
    if (err && err.status === 400 && err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
    if (
      err &&
      typeof err.message === "string" &&
      err.message.includes("Only JPEG, PNG, WebP, or GIF")
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[tourist-node-api] Unhandled error:", err);
    const status =
      err && Number.isFinite(err.status) && err.status >= 400 && err.status < 600
        ? err.status
        : 500;
    res.status(status).json({ error: err?.message || String(err) });
  });

  const server = app.listen(PORT, () => {
    const tok = effectiveAdminToken();
    const openIi = usingBuiltinDevAdminSecret();
    if (process.env.NODE_ENV === "production" && openIi) {
      console.warn(
        "[tourist-node-api] Using built-in dev-admin token. Set APP_ADMIN_TOKEN to a long secret before any public deployment.",
      );
    }
    const tokenHint = openIi
      ? `dev token (${tok.length} chars) — any signed-in II principal is admin; set a real APP_ADMIN_TOKEN to lock this down`
      : `APP_ADMIN_TOKEN set (${tok.length} chars)`;
    const dbHint = pool
      ? "PostgreSQL persistence enabled"
      : "in-memory only (set DB_HOST+DB_NAME or DATABASE_URL for Postgres)";
    console.log(
      `tourist-node-api listening on port ${PORT} (all interfaces) — ${tokenHint} — ${dbHint}`,
    );
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[tourist-node-api] Port ${PORT} is already in use — stop the other process or pick another port.`,
      );
      console.error(
        `  Find PID (Windows): netstat -ano | findstr :${PORT}`,
      );
      console.error(`  Then: taskkill /PID <pid> /F`);
      console.error(
        `  Or: set PORT=4945 (and set the Vite proxy target to the same port).`,
      );
      process.exit(1);
    }
    console.error("[tourist-node-api] Server error:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("[tourist-node-api] Failed to start:", err);
  process.exit(1);
});
