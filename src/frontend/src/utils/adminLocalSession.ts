const STORAGE_KEY = "tourist_admin_jwt";

/** Bearer token for Node `/admin-auth/*` and admin API routes (no Internet Identity). */
export function getAdminBearerToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const t = sessionStorage.getItem(STORAGE_KEY)?.trim();
    return t || null;
  } catch {
    return null;
  }
}

export function setAdminBearerToken(token: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (token?.trim()) sessionStorage.setItem(STORAGE_KEY, token.trim());
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** For React Query keys: changes when JWT is added or removed. */
export function adminLocalJwtKeyPart(): string {
  return getAdminBearerToken() ? "jwt" : "nojwt";
}
