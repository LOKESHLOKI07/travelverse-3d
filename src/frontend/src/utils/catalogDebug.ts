import { viteEnvIsTrue } from "./viteEnv";

/**
 * Browser DevTools console. Enabled when running `vite` (DEV) or when
 * `VITE_DEBUG_CATALOG_MEDIA=true` is set.
 */
export function debugCatalogClient(): boolean {
  if (import.meta.env.DEV) return true;
  return viteEnvIsTrue(import.meta.env.VITE_DEBUG_CATALOG_MEDIA);
}
