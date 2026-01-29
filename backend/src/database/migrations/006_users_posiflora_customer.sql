-- Link local users to Posiflora customers
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS posiflora_customer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_posiflora_customer_id ON users(posiflora_customer_id);

