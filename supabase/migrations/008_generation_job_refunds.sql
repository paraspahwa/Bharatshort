-- Phase 3: compensation refunds on terminal job failures

CREATE TABLE IF NOT EXISTS public.generation_job_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.generation_job_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation job refunds" ON public.generation_job_refunds
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_generation_job_refunds_user_id
  ON public.generation_job_refunds(user_id);

CREATE OR REPLACE FUNCTION public.refund_generation_job_charges(
  p_job_id UUID,
  p_reason TEXT DEFAULT 'Terminal generation failure refund'
)
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_refunded_amount INTEGER;
  v_existing_refund INTEGER;
BEGIN
  SELECT gjr.refunded_amount INTO v_existing_refund
  FROM public.generation_job_refunds gjr
  WHERE gjr.job_id = p_job_id;

  IF v_existing_refund IS NOT NULL THEN
    RETURN v_existing_refund;
  END IF;

  SELECT gl.user_id, gl.project_id, COALESCE(SUM(gl.amount), 0)
    INTO v_user_id, v_project_id, v_refunded_amount
  FROM public.generation_charge_ledger gl
  WHERE gl.job_id = p_job_id
  GROUP BY gl.user_id, gl.project_id;

  IF v_user_id IS NULL OR v_project_id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_refunded_amount > 0 THEN
    UPDATE public.users
    SET credits = credits + v_refunded_amount
    WHERE id = v_user_id;

    INSERT INTO public.credit_transactions (
      user_id,
      project_id,
      amount,
      transaction_type,
      description
    )
    VALUES (
      v_user_id,
      v_project_id,
      v_refunded_amount,
      'refund',
      COALESCE(p_reason, 'Terminal generation failure refund')
    );
  END IF;

  INSERT INTO public.generation_job_refunds (
    job_id,
    project_id,
    user_id,
    refunded_amount,
    reason
  )
  VALUES (
    p_job_id,
    v_project_id,
    v_user_id,
    v_refunded_amount,
    p_reason
  )
  ON CONFLICT (job_id) DO NOTHING;

  RETURN v_refunded_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
