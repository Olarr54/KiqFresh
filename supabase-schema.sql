-- Run this in: Supabase Dashboard → SQL Editor → New Query

CREATE TABLE orders (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT        UNIQUE NOT NULL,
  customer_name     TEXT,
  customer_email    TEXT        NOT NULL DEFAULT 'unknown',
  service_type      TEXT,
  amount            INTEGER,
  status            TEXT        NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'cleaning', 'ready', 'delivered')),
  tracking_token    UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Lock down public access (all queries go via Netlify Functions using service role key)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
