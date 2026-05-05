-- Non-destructive: new table only
CREATE TABLE IF NOT EXISTS public.temporary_password_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  must_change_password boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

ALTER TABLE public.temporary_password_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage temp password flags"
ON public.temporary_password_flags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own temp password flag"
ON public.temporary_password_flags
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own temp password flag"
ON public.temporary_password_flags
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_temp_pwd_flags_user ON public.temporary_password_flags(user_id);