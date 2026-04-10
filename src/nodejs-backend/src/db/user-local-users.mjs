/**
 * @param {import('pg').Pool} pool
 * @param {{ username: string, email: string, passwordHash: string }} row
 */
export async function dbInsertUserLocalUser(pool, row) {
  const r = await pool.query(
    `INSERT INTO user_local_users (username, email, password_hash)
     VALUES ($1, lower(trim($2)), $3) RETURNING id, username, email`,
    [row.username.trim(), row.email, row.passwordHash],
  );
  return r.rows[0];
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbGetUserLocalByEmail(pool, email) {
  const r = await pool.query(
    `SELECT id, username, email, password_hash FROM user_local_users WHERE email = lower(trim($1))`,
    [email],
  );
  return r.rows[0] ?? null;
}
