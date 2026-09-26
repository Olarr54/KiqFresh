-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- Powers the "Booking Availability" panel in /admin — lets you change
-- which days you're closed and your collection/drop-off hours without
-- touching any code.

CREATE TABLE booking_settings (
  id           SMALLINT PRIMARY KEY DEFAULT 1,
  closed_days  INTEGER[]   NOT NULL DEFAULT '{3}',   -- 0=Sunday .. 6=Saturday
  start_time   TEXT        NOT NULL DEFAULT '12:00', -- 24hr HH:MM
  end_time     TEXT        NOT NULL DEFAULT '17:00', -- 24hr HH:MM
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO booking_settings (id, closed_days, start_time, end_time)
VALUES (1, '{3}', '12:00', '17:00');

-- Lock down public access (reads/writes go via Netlify Functions using the service role key)
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
