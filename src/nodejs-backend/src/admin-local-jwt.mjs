import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_DEV_SECRET = "tourist-dev-admin-jwt-secret-change-me";

export function adminJwtSecret() {
  return process.env.ADMIN_JWT_SECRET?.trim() || DEFAULT_DEV_SECRET;
}

/**
 * @param {{ sub: number, un: string, expSec: number }} payload
 */
export function signAdminToken(payload) {
  const secret = adminJwtSecret();
  const body = Buffer.from(
    JSON.stringify({
      typ: "admin",
      sub: payload.sub,
      un: payload.un,
      exp: payload.expSec,
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ sub: number, un: string } | null}
 */
/**
 * @param {{ sub: number, un: string, expSec: number }} payload
 */
export function signUserToken(payload) {
  const secret = adminJwtSecret();
  const body = Buffer.from(
    JSON.stringify({
      typ: "user",
      sub: payload.sub,
      un: payload.un,
      exp: payload.expSec,
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ sub: number, un: string } | null}
 */
export function verifyUserToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const secret = adminJwtSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (parsed.typ !== "user" || typeof parsed.sub !== "number") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
  return { sub: parsed.sub, un: String(parsed.un ?? "") };
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const secret = adminJwtSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (parsed.typ !== "admin" || typeof parsed.sub !== "number") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
  return { sub: parsed.sub, un: String(parsed.un ?? "") };
}
