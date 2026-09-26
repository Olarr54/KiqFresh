-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- Powers the "Booking Availability" panel in /admin — lets you change
-- which days you're closed and your collection/drop-off hours without
-- touching any code.

CREATE TABLE booking_settings (
  id           SMALLINT PRIMARY KEY DEFAULT 1,
  closed_days  INTEGER[]   NOT NULL DEFAULT '{3}',
  start_time   TEXT        NOT NULL DEFAULT '12:00',
  end_time     TEXT        NOT NULL DEFAULT '17:00',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO booking_settings (id, closed_days, start_time, end_time)
VALUES (1, '{3}', '12:00', '17:00');

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
