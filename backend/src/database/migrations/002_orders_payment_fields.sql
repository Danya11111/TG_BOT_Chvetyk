-- Дополнительные поля для оплаты и данных получателя
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS card_text TEXT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by BIGINT,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_rejected_by BIGINT,
  ADD COLUMN IF NOT EXISTS payment_rejected_at TIMESTAMP;
