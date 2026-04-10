import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { signUserToken } from "./admin-local-jwt.mjs";
import { dbGetAdminLocalByEmail } from "./db/admin-local-users.mjs";
import { dbUpsertUser } from "./db/users.mjs";
import {
  dbDeleteUserRegistrationOtp,
  dbGetUserRegistrationOtp,
  dbUpsertUserRegistrationOtp,
} from "./db/user-registration-otp.mjs";
import { dbGetUserLocalByEmail, dbInsertUserLocalUser } from "./db/user-local-users.mjs";
import { sendRegistrationOtpEmail } from "./mail/send-registration-otp.mjs";

const LOCAL_USER_PRINCIPAL_PREFIX = "local-user:";

/**
 * @param {import("express").Express} app
 * @param {{
 *   pool: import("pg").Pool | null,
 *   memoryUsers: { users: Map<string, { id: number, username: string, passwordHash: string }>, nextId: number },
 *   userRegistrationOtpMemory: Map<string, { otpHash: string, expiresAtMs: number }>,
 *   userRegistrationOtpRateMs: Map<string, number>,
 *   userProfilesMemory: Map<string, { name: string, email: string, phone: string }>,
 *   userRolesMemory: Map<string, "admin" | "user" | "guest">,
 *   memoryAdmins?: { users: Map<string, unknown> },
 * }} ctx
 */
export function attachUserLocalAuthRoutes(app, ctx) {
  const {
    pool,
    memoryUsers,
    userRegistrationOtpMemory,
    userRegistrationOtpRateMs,
    userProfilesMemory,
    userRolesMemory,
    memoryAdmins,
  } = ctx;

  const OTP_RESEND_MS = 60_000;
  const OTP_TTL_MS = 10 * 60_000;

  function normalizeEmail(e) {
    return String(e ?? "")
      .trim()
      .toLowerCase();
  }

  async function userExistsByEmail(email) {
    if (pool) {
      const row = await dbGetUserLocalByEmail(pool, email);
      return !!row;
    }
    return memoryUsers.users.has(email);
  }

  async function emailUsedByAdmin(email) {
    if (pool) {
      const row = await dbGetAdminLocalByEmail(pool, email);
      return !!row;
    }
    return Boolean(memoryAdmins?.users.has(email));
  }

  app.post("/user-auth/send-registration-otp", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Invalid email" });
        return;
      }
      if (await emailUsedByAdmin(email)) {
        res.status(409).json({ error: "This email is registered as an admin account" });
        return;
      }
      if (await userExistsByEmail(email)) {
        res.status(409).json({ error: "This email is already registered" });
        return;
      }

      const now = Date.now();
      const last = userRegistrationOtpRateMs.get(email) ?? 0;
      if (now - last < OTP_RESEND_MS) {
        res.status(429).json({
          error: `Wait ${Math.ceil((OTP_RESEND_MS - (now - last)) / 1000)}s before requesting another code.`,
        });
        return;
      }

      const otp = String(randomInt(100_000, 1_000_000));
      const otpHash = await bcrypt.hash(otp, 8);
      const expiresAtMs = now + OTP_TTL_MS;
      const expiresAt = new Date(expiresAtMs);

      if (pool) {
        await dbUpsertUserRegistrationOtp(pool, email, otpHash, expiresAt);
      } else {
        userRegistrationOtpMemory.set(email, { otpHash, expiresAtMs });
      }
      userRegistrationOtpRateMs.set(email, now);

      const mailResult = await sendRegistrationOtpEmail(email, otp, "user");
      const body = { ok: true, message: "Verification code sent" };
      if (
        process.env.TOURIST_DEV_OTP_IN_RESPONSE?.trim() === "1" &&
        mailResult.devMode
      ) {
        body.devOtp = otp;
      }
      res.json(body);
    } catch (e) {
      console.error("[tourist-node-api] user-auth/send-registration-otp:", e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/user-auth/register", async (req, res) => {
    try {
      const username = String(req.body?.username ?? "").trim();
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password ?? "");
      const otp = String(req.body?.otp ?? "").replace(/\D/g, "");

      if (username.length < 2) {
        res.status(400).json({ error: "Username must be at least 2 characters" });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Invalid email" });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }
      if (otp.length !== 6) {
        res.status(400).json({ error: "Enter the 6-digit code from your email" });
        return;
      }

      if (await emailUsedByAdmin(email)) {
        res.status(409).json({ error: "This email is registered as an admin account" });
        return;
      }
      if (await userExistsByEmail(email)) {
        res.status(409).json({ error: "This email is already registered" });
        return;
      }

      let otpHash;
      let expiresAtMs;
      if (pool) {
        const row = await dbGetUserRegistrationOtp(pool, email);
        if (!row) {
          res.status(400).json({
            error: "No verification code for this email — request a new code.",
          });
          return;
        }
        expiresAtMs = new Date(row.expires_at).getTime();
        if (Date.now() > expiresAtMs) {
          await dbDeleteUserRegistrationOtp(pool, email);
          res.status(400).json({
            error: "Code expired — request a new verification code.",
          });
          return;
        }
        otpHash = row.otp_hash;
      } else {
        const row = userRegistrationOtpMemory.get(email);
        if (!row) {
          res.status(400).json({
            error: "No verification code for this email — request a new code.",
          });
          return;
        }
        expiresAtMs = row.expiresAtMs;
        if (Date.now() > expiresAtMs) {
          userRegistrationOtpMemory.delete(email);
          res.status(400).json({
            error: "Code expired — request a new verification code.",
          });
          return;
        }
        otpHash = row.otpHash;
      }

      const otpOk = await bcrypt.compare(otp, otpHash);
      if (!otpOk) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      if (pool) await dbDeleteUserRegistrationOtp(pool, email);
      else userRegistrationOtpMemory.delete(email);

      const passwordHash = await bcrypt.hash(password, 10);

      if (pool) {
        try {
          const row = await dbInsertUserLocalUser(pool, {
            username,
            email,
            passwordHash,
          });
          const principal = `${LOCAL_USER_PRINCIPAL_PREFIX}${row.id}`;
          await dbUpsertUser(pool, principal, {
            role: "user",
            name: username,
            email,
            phone: "—",
          });
          res.status(201).json({
            id: row.id,
            username: row.username,
            email: row.email,
          });
        } catch (e) {
          if (e.code === "23505") {
            res.status(409).json({ error: "Username or email already registered" });
            return;
          }
          throw e;
        }
      } else {
        if (memoryUsers.users.has(email)) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }
        for (const u of memoryUsers.users.values()) {
          if (u.username.toLowerCase() === username.toLowerCase()) {
            res.status(409).json({ error: "Username already registered" });
            return;
          }
        }
        const id = memoryUsers.nextId++;
        memoryUsers.users.set(email, { id, username, passwordHash });
        const principal = `${LOCAL_USER_PRINCIPAL_PREFIX}${id}`;
        userRolesMemory.set(principal, "user");
        userProfilesMemory.set(principal, { name: username, email, phone: "—" });
        res.status(201).json({ id, username, email });
      }
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/user-auth/login", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password ?? "");
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }

      let row;
      if (pool) row = await dbGetUserLocalByEmail(pool, email);
      else row = memoryUsers.users.get(email) ?? null;

      if (!row) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const hash = pool ? row.password_hash : row.passwordHash;
      const ok = await bcrypt.compare(password, hash);
      if (!ok) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const expSec = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      const token = signUserToken({
        sub: row.id,
        un: row.username,
        expSec,
      });
      res.json({
        token,
        expiresInSec: 60 * 60 * 24 * 7,
        username: row.username,
        email: row.email,
      });
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.get("/user-auth/me", (req, res) => {
    if (!req.localUserSession?.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({
      userId: req.localUserSession.userId,
      username: req.localUserSession.username,
    });
  });
}
