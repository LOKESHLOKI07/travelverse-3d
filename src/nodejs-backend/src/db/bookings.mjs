function rowToBooking(row) {
  const addOns = Array.isArray(row.add_ons)
    ? row.add_ons
    : typeof row.add_ons === "string"
      ? JSON.parse(row.add_ons || "[]")
      : [];
  return {
    bookingId: Number(row.booking_id),
    packageCategory: row.package_category,
    packageName: row.package_name,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    travelDate: row.travel_date,
    groupSize: BigInt(row.group_size),
    addOns,
    totalPriceINR: BigInt(row.total_price_inr),
    status: row.status,
    createdTimestamp: BigInt(row.created_timestamp),
    catalogPackageId: Number(row.catalog_package_id ?? 0),
    catalogBatchId:
      row.catalog_batch_id != null ? Number(row.catalog_batch_id) : undefined,
    catalogTierIndex:
      row.catalog_tier_index != null ? Number(row.catalog_tier_index) : undefined,
  };
}

/**
 * @param {import('pg').Pool} pool
 * @param {object} booking
 */
export async function dbInsertBooking(pool, booking) {
  const r = await pool.query(
    `INSERT INTO bookings (
      package_category, package_name, customer_name, customer_email, customer_phone,
      travel_date, group_size, add_ons, total_price_inr, status, created_timestamp,
      catalog_package_id, catalog_batch_id, catalog_tier_index
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14)
    RETURNING booking_id`,
    [
      booking.packageCategory,
      booking.packageName,
      booking.customerName,
      booking.customerEmail,
      booking.customerPhone,
      booking.travelDate,
      booking.groupSize.toString(),
      JSON.stringify(booking.addOns),
      booking.totalPriceINR.toString(),
      booking.status,
      booking.createdTimestamp.toString(),
      booking.catalogPackageId ?? 0,
      booking.catalogBatchId ?? null,
      booking.catalogTierIndex ?? null,
    ],
  );
  return Number(r.rows[0].booking_id);
}

/**
 * @param {import('pg').Pool} pool
 */
export async function dbListAllBookings(pool) {
  const r = await pool.query(
    `SELECT * FROM bookings ORDER BY booking_id ASC`,
  );
  return r.rows.map(rowToBooking);
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function dbListBookingsByEmail(pool, email) {
  const r = await pool.query(
    `SELECT * FROM bookings WHERE lower(customer_email) = lower($1) ORDER BY booking_id ASC`,
    [email],
  );
  return r.rows.map(rowToBooking);
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} id
 * @param {string} status
 */
export async function dbUpdateBookingStatus(pool, id, status) {
  const r = await pool.query(
    `UPDATE bookings SET status = $2 WHERE booking_id = $1 RETURNING booking_id`,
    [id, status],
  );
  return r.rowCount > 0;
}
