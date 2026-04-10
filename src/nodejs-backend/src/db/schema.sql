-- tourist-node-api PostgreSQL schema (run on startup via migrate.mjs)

CREATE TABLE IF NOT EXISTS app_users (
  ic_principal TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email) WHERE email <> '';

CREATE TABLE IF NOT EXISTS bookings (
  booking_id BIGSERIAL PRIMARY KEY,
  package_category TEXT NOT NULL,
  package_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  group_size BIGINT NOT NULL,
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price_inr BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled')
  ),
  created_timestamp BIGINT NOT NULL,
  catalog_package_id BIGINT NOT NULL DEFAULT 0,
  catalog_batch_id BIGINT,
  catalog_tier_index BIGINT
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings (customer_email);

CREATE TABLE IF NOT EXISTS catalog_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS catalog_packages (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES catalog_categories (id) ON DELETE RESTRICT,
  body JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_packages_category ON catalog_packages (category_id);

CREATE SEQUENCE IF NOT EXISTS catalog_batch_id_seq;

CREATE TABLE IF NOT EXISTS admin_local_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_registration_otps (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS user_local_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_registration_otps (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
