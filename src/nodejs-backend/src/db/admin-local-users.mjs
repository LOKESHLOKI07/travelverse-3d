/**
 * @param {import('pg').Pool} pool
 */
export async function dbCountAdminLocalUsers(pool) {
  const r = await pool.query(`SELECT COUNT(*)::int AS n FROM admin_local_users`);
  return r.rows[0].n;
}

/**
 * @param {import('pg').Pool} pool
 * @param {{ username: string, email: string, passwordHash: string }} row
 */
export async function dbInsertAdminLocalUser(pool, row) {
  const r = await pool.query(
    `INSERT INTO admin_local_users (username, email, password_hash)
     VALUES ($1, lower(trim($2)), $3) RETURNING id, username, email`,
    [row.username.trim(), row.email, row.passwordHash],
  );
  return r.rows[0];
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbGetAdminLocalByEmail(pool, email) {
  const r = await pool.query(
    `SELECT id, username, email, password_hash FROM admin_local_users WHERE email = lower(trim($1))`,
    [email],
  );
  return r.rows[0] ?? null;
}
