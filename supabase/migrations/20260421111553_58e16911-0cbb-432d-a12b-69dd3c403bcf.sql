
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS ingrediente_activo text,
  ADD COLUMN IF NOT EXISTS concentracion text,
  ADD COLUMN IF NOT EXISTS registro_ica text,
  ADD COLUMN IF NOT EXISTS categoria_toxicologica text,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS numero_lote text,
  ADD COLUMN IF NOT EXISTS titular_registro text,
  ADD COLUMN IF NOT EXISTS contenido_neto text;
