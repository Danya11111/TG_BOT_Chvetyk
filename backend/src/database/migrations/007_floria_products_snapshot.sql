-- Snapshot of Floria catalog for fast reads without calling Floria API on user request.
-- Updated by sync job (cron and on startup).

CREATE TABLE IF NOT EXISTS floria_products_snapshot (
  floria_id INTEGER PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  old_price DECIMAL(12, 2),
  currency VARCHAR(10) NOT NULL DEFAULT 'RUB',
  category_name VARCHAR(255),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  composition TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  in_showcase BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floria_products_snapshot_in_showcase ON floria_products_snapshot (in_showcase);
CREATE INDEX IF NOT EXISTS idx_floria_products_snapshot_name ON floria_products_snapshot (name);
