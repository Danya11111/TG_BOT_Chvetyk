-- Posiflora customers cache
CREATE TABLE IF NOT EXISTS posiflora_customers (
  id SERIAL PRIMARY KEY,
  posiflora_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  current_points DECIMAL(10, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_posiflora_customers_phone ON posiflora_customers(phone);
