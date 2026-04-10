/**
 * Load the full demo tour catalog into PostgreSQL (same data as catalog-store-memory seed
 * and the admin UI static fallback in staticDemoCatalog.ts).
 *
 * Usage (from src/nodejs-backend):
 *   node scripts/seed-demo-catalog.mjs           # TRUNCATE catalog tables, then insert demo
 *   node scripts/seed-demo-catalog.mjs --if-empty # only seed when catalog_categories is empty
 *
 * Requires DATABASE_URL or DB_HOST + DB_NAME in .env
 */

import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPgCatalogStore } from "../src/catalog-store-pg.mjs";
import { runMigrations } from "../src/db/migrate.mjs";
import { createPoolFromEnv, isDatabaseEnabled } from "../src/db/pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const ifEmptyOnly = process.argv.includes("--if-empty");

async function main() {
  if (!isDatabaseEnabled()) {
    console.error(
      "[seed-demo-catalog] Set DATABASE_URL or DB_HOST + DB_NAME in .env",
    );
    process.exit(1);
  }
  const pool = createPoolFromEnv();
  if (!pool) {
    console.error("[seed-demo-catalog] Could not create pool");
    process.exit(1);
  }
  await runMigrations(pool);
  const catalog = createPgCatalogStore(pool);

  const had =
    (await catalog.countCategories()) > 0 || (await catalog.countPackages()) > 0;

  if (ifEmptyOnly) {
    if (had) {
      console.log(
        "[seed-demo-catalog] Catalog already has data; skipped (--if-empty).",
      );
      await pool.end();
      return;
    }
    await catalog.seedIfEmpty();
  } else {
    if (had) {
      console.log("[seed-demo-catalog] Resetting catalog tables…");
    }
    await catalog.resetStorage();
    await catalog.seedIfEmpty();
  }

  console.log(
    `[seed-demo-catalog] Done. categories=${await catalog.countCategories()} packages=${await catalog.countPackages()}`,
  );
  await pool.end();
}

main().catch((e) => {
  console.error("[seed-demo-catalog]", e);
  process.exit(1);
});
