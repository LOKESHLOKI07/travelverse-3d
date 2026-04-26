/** Set `TOURIST_DEBUG_CATALOG_MEDIA=1` in `.env` to log uploads and catalog saves (Node terminal). */
export function debugCatalogMedia() {
  const v = process.env.TOURIST_DEBUG_CATALOG_MEDIA?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
