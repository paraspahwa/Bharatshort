-- Admin access audit trail for grant/revoke actions

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL, -- grant, revoke
  actor_type TEXT NOT NULL, -- dashboard_admin, internal_worker
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_email TEXT,
  notes TEXT,
  source TEXT NOT NULL, -- dashboard_proxy, internal_api
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users cannot read admin_audit_logs" ON public.admin_audit_logs
  FOR SELECT USING (FALSE);

CREATE POLICY "Users cannot modify admin_audit_logs" ON public.admin_audit_logs
  FOR ALL USING (FALSE) WITH CHECK (FALSE);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id
  ON public.admin_audit_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id
  ON public.admin_audit_logs(actor_user_id);
