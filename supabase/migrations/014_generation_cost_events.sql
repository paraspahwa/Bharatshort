-- Phase 9: generation cost telemetry for unit-economics analysis

CREATE TABLE IF NOT EXISTS public.generation_cost_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  usage_unit TEXT NOT NULL,
  usage_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  unit_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.generation_cost_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation cost events" ON public.generation_cost_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_generation_cost_events_user_id
  ON public.generation_cost_events(user_id);

CREATE INDEX IF NOT EXISTS idx_generation_cost_events_job_id
  ON public.generation_cost_events(job_id);

CREATE INDEX IF NOT EXISTS idx_generation_cost_events_project_created
  ON public.generation_cost_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_cost_events_stage
  ON public.generation_cost_events(stage);