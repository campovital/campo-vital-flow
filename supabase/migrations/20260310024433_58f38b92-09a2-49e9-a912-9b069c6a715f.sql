
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS weather_conditions text,
  ADD COLUMN IF NOT EXISTS biological_target text,
  ADD COLUMN IF NOT EXISTS equipment_type text DEFAULT 'Estacionaria',
  ADD COLUMN IF NOT EXISTS application_type text DEFAULT 'foliar',
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS water_volume_liters numeric,
  ADD COLUMN IF NOT EXISTS tank_wash_management text,
  ADD COLUMN IF NOT EXISTS leftover_broth_liters numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reentry_hours text;
