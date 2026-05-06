-- Add 'inventario' to app_module enum and seed default permissions for admin and agronoma
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'inventario';