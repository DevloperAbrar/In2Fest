-- Run once on your PostgreSQL database

ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS service_type   VARCHAR(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_units    INTEGER      NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS packages (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      UUID          NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          VARCHAR(200)  NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) DEFAULT NULL,
  slot_ids      JSONB         NOT NULL DEFAULT '[]',
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_packages_venue_id ON packages(venue_id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS date_from      DATE          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_to        DATE          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_time     TIME          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time       TIME          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booking_items  JSONB         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS package_id     UUID          DEFAULT NULL REFERENCES packages(id) ON DELETE SET NULL;

UPDATE bookings SET date_from = event_date, date_to = event_date
WHERE date_from IS NULL AND event_date IS NOT NULL;

UPDATE bookings b SET start_time = s.start_time, end_time = s.end_time
FROM slots s
WHERE b.slot_id = s.id AND b.start_time IS NULL AND s.start_time IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_units (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  venue_id     UUID        NOT NULL REFERENCES venues(id)   ON DELETE CASCADE,
  slot_id      UUID        NOT NULL REFERENCES slots(id)    ON DELETE CASCADE,
  date         DATE        NOT NULL,
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  units_used   INTEGER     NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_units_venue_date ON booking_units(venue_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_units_slot       ON booking_units(slot_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_units_booking    ON booking_units(booking_id);