const STORAGE_KEY = "tourist_user_jwt";

/** Bearer token for Node `/user-auth/*` and traveler API routes (email + password, no Internet Identity). */
export function getUserBearerToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const t = sessionStorage.getItem(STORAGE_KEY)?.trim();
    return t || null;
  } catch {
    return null;
  }
}

export function setUserBearerToken(token: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (token?.trim()) sessionStorage.setItem(STORAGE_KEY, token.trim());
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function userLocalJwtKeyPart(): string {
  return getUserBearerToken() ? "userjwt" : "nouserjwt";
}
