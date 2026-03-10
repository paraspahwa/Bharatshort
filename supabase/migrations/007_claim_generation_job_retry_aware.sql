-- Make job claiming retry-aware and max-attempt aware

CREATE OR REPLACE FUNCTION public.claim_generation_job(
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  user_id UUID,
  status TEXT,
  progress INTEGER,
  current_step TEXT,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  SELECT gj.id
  INTO v_job_id
  FROM public.generation_jobs gj
  WHERE (
    (
      gj.status = 'queued'
      AND COALESCE(gj.retry_at, NOW()) <= NOW()
      AND gj.attempt_count < gj.max_attempts
    )
    OR (
      gj.status = 'processing'
      AND gj.lease_expires_at IS NOT NULL
      AND gj.lease_expires_at < NOW()
      AND gj.attempt_count < gj.max_attempts
    )
  )
  ORDER BY gj.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.generation_jobs
  SET status = 'processing',
      current_step = COALESCE(current_step, 'claimed'),
      started_at = COALESCE(started_at, NOW()),
      retry_at = NULL,
      lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
      last_heartbeat_at = NOW(),
      attempt_count = attempt_count + 1
  WHERE generation_jobs.id = v_job_id;

  RETURN QUERY
  SELECT gj.id, gj.project_id, gj.user_id, gj.status, gj.progress, gj.current_step, gj.attempt_count
  FROM public.generation_jobs gj
  WHERE gj.id = v_job_id;
END;
$$;
