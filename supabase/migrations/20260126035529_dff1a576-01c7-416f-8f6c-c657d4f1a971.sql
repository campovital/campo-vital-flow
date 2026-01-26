-- Create enum for modules
CREATE TYPE public.app_module AS ENUM (
  'aplicar_mezcla',
  'reporte_sanitario',
  'seguimiento_sanitario',
  'cosecha',
  'tareas',
  'costos',
  'informes',
  'configuracion',
  'roles'
);

-- Create enum for actions
CREATE TYPE public.app_action AS ENUM (
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export'
);

-- Create role_permissions table for granular RBAC
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module public.app_module NOT NULL,
  action public.app_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module, action)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can view permissions (needed for UI)
CREATE POLICY "Authenticated can view permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module app_module, _action app_action)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.module = _module
      AND rp.action = _action
  )
$$;

-- Insert default permissions for admin (all permissions)
INSERT INTO public.role_permissions (role, module, action)
SELECT 'admin', m.module, a.action
FROM unnest(ARRAY['aplicar_mezcla', 'reporte_sanitario', 'seguimiento_sanitario', 'cosecha', 'tareas', 'costos', 'informes', 'configuracion', 'roles']::app_module[]) AS m(module)
CROSS JOIN unnest(ARRAY['view', 'create', 'edit', 'delete', 'approve', 'export']::app_action[]) AS a(action);

-- Insert default permissions for agronoma (most permissions except roles management)
INSERT INTO public.role_permissions (role, module, action)
SELECT 'agronoma', m.module, a.action
FROM unnest(ARRAY['aplicar_mezcla', 'reporte_sanitario', 'seguimiento_sanitario', 'cosecha', 'tareas', 'costos', 'informes', 'configuracion']::app_module[]) AS m(module)
CROSS JOIN unnest(ARRAY['view', 'create', 'edit', 'delete', 'approve', 'export']::app_action[]) AS a(action);

-- Insert default permissions for operario (limited permissions)
INSERT INTO public.role_permissions (role, module, action)
VALUES
  ('operario', 'aplicar_mezcla', 'view'),
  ('operario', 'aplicar_mezcla', 'create'),
  ('operario', 'reporte_sanitario', 'view'),
  ('operario', 'reporte_sanitario', 'create'),
  ('operario', 'seguimiento_sanitario', 'view'),
  ('operario', 'cosecha', 'view'),
  ('operario', 'cosecha', 'create'),
  ('operario', 'tareas', 'view'),
  ('operario', 'tareas', 'create');

-- Insert default permissions for consulta (view only)
INSERT INTO public.role_permissions (role, module, action)
SELECT 'consulta', m.module, 'view'::app_action
FROM unnest(ARRAY['aplicar_mezcla', 'reporte_sanitario', 'seguimiento_sanitario', 'cosecha', 'informes']::app_module[]) AS m(module);

-- Add trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();