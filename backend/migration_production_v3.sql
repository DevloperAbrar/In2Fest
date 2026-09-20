-- In2Fest production schema sync (idempotent - safe to run multiple times)
-- Production does NOT auto-sync models, so every model change needs SQL here.

BEGIN;

-- ── slots ─────────────────────────────────────────────────────
ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_units  INTEGER      NOT NULL DEFAULT 1;

-- ── packages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID          NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) DEFAULT NULL,
  slot_ids    JSONB         NOT NULL DEFAULT '[]',
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_packages_venue_id ON packages(venue_id);

-- ── bookings ──────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS date_from     DATE  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_to       DATE  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_time    TIME  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time      TIME  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booking_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS package_id    UUID  DEFAULT NULL REFERENCES packages(id) ON DELETE SET NULL;

UPDATE bookings SET date_from = event_date, date_to = event_date
WHERE date_from IS NULL AND event_date IS NOT NULL;

UPDATE bookings b SET start_time = s.start_time, end_time = s.end_time
FROM slots s
WHERE b.slot_id = s.id AND b.start_time IS NULL AND s.start_time IS NOT NULL;

ALTER TABLE bookings ALTER COLUMN slot_id    DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN event_date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_date_from ON bookings(date_from);

-- ── booking_units ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_units (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  venue_id   UUID        NOT NULL REFERENCES venues(id)   ON DELETE CASCADE,
  slot_id    UUID        NOT NULL REFERENCES slots(id)    ON DELETE CASCADE,
  date       DATE        NOT NULL,
  start_time TIME        NOT NULL,
  end_time   TIME        NOT NULL,
  units_used INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_units_venue_date ON booking_units(venue_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_units_slot       ON booking_units(slot_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_units_booking    ON booking_units(booking_id);

-- ── inquiries (multi-slot selection) ──────────────────────────
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS selected_slots JSON DEFAULT '[]'::json;

-- ── venues (vendor-defined services with sub-options) ─────────
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS marketplace_services_detail JSONB DEFAULT '[]'::jsonb;

-- ── announcements ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id            SERIAL       PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  image_url     TEXT,
  link_url      VARCHAR(500),
  display_order INTEGER      DEFAULT 0,
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- covers the case where the table already exists from an older partial version
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS title     VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT;
CREATE INDEX IF NOT EXISTS announcements_is_active     ON announcements(is_active);
CREATE INDEX IF NOT EXISTS announcements_display_order ON announcements(display_order);

-- ── city_requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_requests (
  id           SERIAL       PRIMARY KEY,
  city         VARCHAR(100) NOT NULL,
  city_key     VARCHAR(100) NOT NULL,
  contact      VARCHAR(150) NOT NULL,
  contact_key  VARCHAR(150) NOT NULL,
  contact_type VARCHAR(10)  NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  notified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS city_requests_city_contact_unique ON city_requests(city_key, contact_key);
CREATE INDEX        IF NOT EXISTS city_requests_status_idx          ON city_requests(status);

COMMIT;