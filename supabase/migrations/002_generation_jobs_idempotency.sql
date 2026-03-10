-- Phase 1 hardening for generation job idempotency and recoverability

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_stage TEXT,
  ADD COLUMN IF NOT EXISTS error_context JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_jobs_user_idempotency
  ON public.generation_jobs(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_lease_expires_at
  ON public.generation_jobs(lease_expires_at);
