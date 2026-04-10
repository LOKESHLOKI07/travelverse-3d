import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { signAdminToken } from "./admin-local-jwt.mjs";
import {
  dbCountAdminLocalUsers,
  dbGetAdminLocalByEmail,
  dbInsertAdminLocalUser,
} from "./db/admin-local-users.mjs";
import {
  dbDeleteRegistrationOtp,
  dbGetRegistrationOtp,
  dbUpsertRegistrationOtp,
} from "./db/admin-registration-otp.mjs";
import { sendRegistrationOtpEmail } from "./mail/send-registration-otp.mjs";

/**
 * @param {import("express").Express} app
 * @param {{
 *   pool: import("pg").Pool | null,
 *   memoryAdmins: { users: Map<string, { id: number, username: string, passwordHash: string }>, nextId: number },
 *   registrationOtpMemory: Map<string, { otpHash: string, expiresAtMs: number }>,
 *   registrationOtpRateMs: Map<string, number>,
 *   effectiveAdminToken: () => string,
 * }} ctx
 */
export function attachAdminLocalAuthRoutes(app, ctx) {
  const {
    pool,
    memoryAdmins,
    registrationOtpMemory,
    registrationOtpRateMs,
    effectiveAdminToken,
  } = ctx;

  const OTP_RESEND_MS = 60_000;
  const OTP_TTL_MS = 10 * 60_000;

  function normalizeEmail(e) {
    return String(e ?? "")
      .trim()
      .toLowerCase();
  }

  async function adminExistsByEmail(email) {
    if (pool) {
      const row = await dbGetAdminLocalByEmail(pool, email);
      return !!row;
    }
    return memoryAdmins.users.has(email);
  }

  async function assertCanRegisterExtraAdmin(req, res) {
    let count;
    if (pool) count = await dbCountAdminLocalUsers(pool);
    else count = memoryAdmins.users.size;
    if (count === 0) return true;
    const tok = req.headers["x-app-admin-token"];
    const presented = typeof tok === "string" ? tok.trim() : "";
    if (presented !== effectiveAdminToken().trim()) {
      res.status(403).json({
        error:
          "Send header X-App-Admin-Token matching APP_ADMIN_TOKEN to register additional admins (or create the first account when none exist).",
      });
      return false;
    }
    return true;
  }

  app.post("/admin-auth/send-registration-otp", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Invalid email" });
        return;
      }
      if (!(await assertCanRegisterExtraAdmin(req, res))) return;

      if (await adminExistsByEmail(email)) {
        res.status(409).json({ error: "This email is already registered" });
        return;
      }

      const now = Date.now();
      const last = registrationOtpRateMs.get(email) ?? 0;
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
        await dbUpsertRegistrationOtp(pool, email, otpHash, expiresAt);
      } else {
        registrationOtpMemory.set(email, { otpHash, expiresAtMs });
      }
      registrationOtpRateMs.set(email, now);

      await sendRegistrationOtpEmail(email, otp);
      res.json({ ok: true, message: "Verification code sent" });
    } catch (e) {
      console.error("[tourist-node-api] send-registration-otp:", e);
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/admin-auth/register", async (req, res) => {
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
        res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
        return;
      }
      if (otp.length !== 6) {
        res.status(400).json({ error: "Enter the 6-digit code from your email" });
        return;
      }

      if (!(await assertCanRegisterExtraAdmin(req, res))) return;

      if (await adminExistsByEmail(email)) {
        res.status(409).json({ error: "This email is already registered" });
        return;
      }

      let otpHash;
      let expiresAtMs;
      if (pool) {
        const row = await dbGetRegistrationOtp(pool, email);
        if (!row) {
          res.status(400).json({
            error: "No verification code for this email — request a new code.",
          });
          return;
        }
        expiresAtMs = new Date(row.expires_at).getTime();
        if (Date.now() > expiresAtMs) {
          await dbDeleteRegistrationOtp(pool, email);
          res.status(400).json({
            error: "Code expired — request a new verification code.",
          });
          return;
        }
        otpHash = row.otp_hash;
      } else {
        const row = registrationOtpMemory.get(email);
        if (!row) {
          res.status(400).json({
            error: "No verification code for this email — request a new code.",
          });
          return;
        }
        expiresAtMs = row.expiresAtMs;
        if (Date.now() > expiresAtMs) {
          registrationOtpMemory.delete(email);
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

      if (pool) await dbDeleteRegistrationOtp(pool, email);
      else registrationOtpMemory.delete(email);

      const passwordHash = await bcrypt.hash(password, 10);

      if (pool) {
        try {
          const row = await dbInsertAdminLocalUser(pool, {
            username,
            email,
            passwordHash,
          });
          res.status(201).json({
            id: row.id,
            username: row.username,
            email: row.email,
          });
        } catch (e) {
          if (e.code === "23505") {
            res
              .status(409)
              .json({ error: "Username or email already registered" });
            return;
          }
          throw e;
        }
      } else {
        if (memoryAdmins.users.has(email)) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }
        for (const u of memoryAdmins.users.values()) {
          if (u.username.toLowerCase() === username.toLowerCase()) {
            res.status(409).json({ error: "Username already registered" });
            return;
          }
        }
        const id = memoryAdmins.nextId++;
        memoryAdmins.users.set(email, { id, username, passwordHash });
        res.status(201).json({ id, username, email });
      }
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  app.post("/admin-auth/login", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password ?? "");
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }

      let row;
      if (pool) row = await dbGetAdminLocalByEmail(pool, email);
      else row = memoryAdmins.users.get(email) ?? null;

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
      const token = signAdminToken({
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

  app.get("/admin-auth/me", (req, res) => {
    if (!req.localAdminSession?.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({
      userId: req.localAdminSession.userId,
      username: req.localAdminSession.username,
    });
  });
}
