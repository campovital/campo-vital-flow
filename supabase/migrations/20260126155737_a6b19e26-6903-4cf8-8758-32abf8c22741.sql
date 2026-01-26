-- =============================================
-- SECURITY FIX: Restrict sensitive data access
-- =============================================

-- 1. FIX audit_log: Restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can view audit log" ON public.audit_log;
CREATE POLICY "Only admins can view audit log"
ON public.audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 2. FIX operators: Restrict sensitive data to admin/agronoma only
-- Operarios need to see basic info but not wages/identification
DROP POLICY IF EXISTS "Authenticated users can view operators" ON public.operators;
CREATE POLICY "Admin/Agronoma can view all operators"
ON public.operators FOR SELECT
USING (is_admin_or_agronoma(auth.uid()));

-- Create a view for non-admin users to see basic operator info (name only)
CREATE OR REPLACE VIEW public.operators_basic
WITH (security_invoker = true) AS
SELECT id, full_name, is_active, farm_id
FROM public.operators;

-- 3. FIX pest-photos storage: Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'pest-photos';

-- Drop public read policy
DROP POLICY IF EXISTS "Public can view pest photos" ON storage.objects;

-- Add authenticated read policy
CREATE POLICY "Authenticated users can view pest photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pest-photos');

-- 4. FIX product_price_history: Restrict to admin/agronoma (contains pricing info)
DROP POLICY IF EXISTS "Authenticated users can view price history" ON public.product_price_history;
CREATE POLICY "Admin/Agronoma can view price history"
ON public.product_price_history FOR SELECT
USING (is_admin_or_agronoma(auth.uid()));

-- 5. FIX inventory_batches: Restrict unit_cost visibility to admin/agronoma
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.inventory_batches;
CREATE POLICY "Admin/Agronoma can view batches"
ON public.inventory_batches FOR SELECT
USING (is_admin_or_agronoma(auth.uid()));

-- Create basic view for operarios (no cost info)
CREATE OR REPLACE VIEW public.inventory_batches_basic
WITH (security_invoker = true) AS
SELECT id, product_id, batch_number, expiry_date, quantity
FROM public.inventory_batches;