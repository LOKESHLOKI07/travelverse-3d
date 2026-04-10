/**
 * @param {import('pg').Pool} pool
 * @param {string} principal
 */
export async function dbGetUserRow(pool, principal) {
  const r = await pool.query(
    `SELECT ic_principal, role, name, email, phone FROM app_users WHERE ic_principal = $1`,
    [principal],
  );
  return r.rows[0] ?? null;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} principal
 * @param {{ role?: string, name?: string, email?: string, phone?: string }} patch
 */
export async function dbUpsertUser(pool, principal, patch) {
  const existing = await dbGetUserRow(pool, principal);
  const role = patch.role ?? existing?.role ?? "user";
  const name = patch.name ?? existing?.name ?? "";
  const email = patch.email ?? existing?.email ?? "";
  const phone = patch.phone ?? existing?.phone ?? "";
  await pool.query(
    `INSERT INTO app_users (ic_principal, role, name, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ic_principal) DO UPDATE SET
       role = EXCLUDED.role,
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       updated_at = now()`,
    [principal, role, name, email, phone],
  );
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} principal
 * @param {'admin'|'user'|'guest'} role
 */
export async function dbSetRoleOnly(pool, principal, role) {
  await pool.query(
    `INSERT INTO app_users (ic_principal, role) VALUES ($1, $2)
     ON CONFLICT (ic_principal) DO UPDATE SET role = EXCLUDED.role, updated_at = now()`,
    [principal, role],
  );
}

/**
 * Merge profile fields without changing role unless provided.
 * @param {import('pg').Pool} pool
 * @param {string} principal
 * @param {{ name: string, email: string, phone: string }} profile
 */
export async function dbSaveProfile(pool, principal, profile) {
  const row = await dbGetUserRow(pool, principal);
  const role = row?.role ?? "user";
  await pool.query(
    `INSERT INTO app_users (ic_principal, role, name, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (ic_principal) DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       updated_at = now()`,
    [principal, role, profile.name, profile.email, profile.phone],
  );
}
