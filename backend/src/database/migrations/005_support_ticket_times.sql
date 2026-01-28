-- Add timestamps for support SLA tracking and topic name for reuse

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS topic_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS first_client_message_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_client_message_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_manager_response_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_manager_response_at TIMESTAMP;

