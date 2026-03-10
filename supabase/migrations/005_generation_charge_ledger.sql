-- Phase 2: idempotent per-step charge ledger for retry-safe billing

CREATE TABLE IF NOT EXISTS public.generation_charge_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  charge_key TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (job_id, charge_key)
);

ALTER TABLE public.generation_charge_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation charge ledger" ON public.generation_charge_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_generation_charge_ledger_user_id
  ON public.generation_charge_ledger(user_id);

CREATE INDEX IF NOT EXISTS idx_generation_charge_ledger_job_id
  ON public.generation_charge_ledger(job_id);

CREATE OR REPLACE FUNCTION public.deduct_credits_idempotent(
  p_user_id UUID,
  p_project_id UUID,
  p_job_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_charge_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  inserted_count INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be greater than zero';
  END IF;

  INSERT INTO public.generation_charge_ledger (
    job_id,
    project_id,
    user_id,
    charge_key,
    amount,
    description
  )
  VALUES (
    p_job_id,
    p_project_id,
    p_user_id,
    p_charge_key,
    p_amount,
    p_description
  )
  ON CONFLICT (job_id, charge_key) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    -- Charge already applied for this step key.
    RETURN TRUE;
  END IF;

  SELECT credits INTO current_credits
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_credits < p_amount THEN
    DELETE FROM public.generation_charge_ledger
    WHERE job_id = p_job_id
      AND charge_key = p_charge_key;
    RETURN FALSE;
  END IF;

  UPDATE public.users
  SET credits = credits - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, project_id, amount, transaction_type, description)
  VALUES (p_user_id, p_project_id, -p_amount, 'usage', p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
