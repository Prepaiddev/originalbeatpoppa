
-- Add idempotency_key to email_logs
alter table email_logs add column if not exists idempotency_key text unique;
