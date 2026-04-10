/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 * @param {string} otpHash
 * @param {Date} expiresAt
 */
export async function dbUpsertRegistrationOtp(pool, email, otpHash, expiresAt) {
  await pool.query(
    `INSERT INTO admin_registration_otps (email, otp_hash, expires_at)
     VALUES (lower(trim($1)), $2, $3)
     ON CONFLICT (email) DO UPDATE SET otp_hash = $2, expires_at = $3`,
    [email, otpHash, expiresAt],
  );
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbGetRegistrationOtp(pool, email) {
  const r = await pool.query(
    `SELECT otp_hash, expires_at FROM admin_registration_otps WHERE email = lower(trim($1))`,
    [email],
  );
  return r.rows[0] ?? null;
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbDeleteRegistrationOtp(pool, email) {
  await pool.query(
    `DELETE FROM admin_registration_otps WHERE email = lower(trim($1))`,
    [email],
  );
}
