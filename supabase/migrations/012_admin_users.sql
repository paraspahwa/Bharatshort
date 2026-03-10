-- Dashboard admin access control via DB roles (with app-level env fallback)

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users cannot directly read admin_users" ON public.admin_users
  FOR SELECT USING (FALSE);

CREATE POLICY "Users cannot directly modify admin_users" ON public.admin_users
  FOR ALL USING (FALSE) WITH CHECK (FALSE);

CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
