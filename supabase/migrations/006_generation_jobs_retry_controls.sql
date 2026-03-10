-- Retry and dead-letter control fields for generation jobs

ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_generation_jobs_retry_at
  ON public.generation_jobs(retry_at);
