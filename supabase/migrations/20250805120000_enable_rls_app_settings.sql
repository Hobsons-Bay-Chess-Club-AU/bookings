-- Enable RLS and restrict access to public.app_settings to admins only

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access app_settings"
  ON public.app_settings
  FOR ALL
  USING (
    auth.role() = 'admin'
  );
