import pg from "pg";

/**
 * @returns {import('pg').Pool | null}
 */
export function createPoolFromEnv() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new pg.Pool({ connectionString: url });
  }
  const host = process.env.DB_HOST?.trim();
  const name = process.env.DB_NAME?.trim();
  if (host && name) {
    return new pg.Pool({
      host,
      port: Number(process.env.DB_PORT || 5432),
      database: name,
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "",
    });
  }
  return null;
}

export function isDatabaseEnabled() {
  return Boolean(
    process.env.DATABASE_URL?.trim() ||
      (process.env.DB_HOST?.trim() && process.env.DB_NAME?.trim()),
  );
}
