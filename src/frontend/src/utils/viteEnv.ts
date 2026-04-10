/** Vite injects env as strings; treat common truthy spellings as on. */
export function viteEnvIsTrue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const s = value.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}
