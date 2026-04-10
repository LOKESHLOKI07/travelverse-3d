/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 * @param {string} otpHash
 * @param {Date} expiresAt
 */
export async function dbUpsertUserRegistrationOtp(pool, email, otpHash, expiresAt) {
  await pool.query(
    `INSERT INTO user_registration_otps (email, otp_hash, expires_at)
     VALUES (lower(trim($1)), $2, $3)
     ON CONFLICT (email) DO UPDATE SET otp_hash = $2, expires_at = $3`,
    [email, otpHash, expiresAt],
  );
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbGetUserRegistrationOtp(pool, email) {
  const r = await pool.query(
    `SELECT otp_hash, expires_at FROM user_registration_otps WHERE email = lower(trim($1))`,
    [email],
  );
  return r.rows[0] ?? null;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbDeleteUserRegistrationOtp(pool, email) {
  await pool.query(`DELETE FROM user_registration_otps WHERE email = lower(trim($1))`, [
    email,
  ]);
}
