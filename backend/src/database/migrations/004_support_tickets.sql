-- Support tickets (Telegram -> managers supergroup topics)

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  telegram_username VARCHAR(255),
  customer_name VARCHAR(255),

  -- Telegram forum topic routing
  group_chat_id BIGINT NOT NULL,
  thread_id INTEGER NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open | closed

  -- First manager who responded (optional)
  assigned_manager_telegram_id BIGINT,
  assigned_manager_username VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_telegram_id ON support_tickets(telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_group_thread ON support_tickets(group_chat_id, thread_id);

-- Only one open ticket per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_open_per_user
  ON support_tickets(telegram_id)
  WHERE status = 'open';

