-- Add missing UPDATE policy for pest_report_photos
CREATE POLICY "Admin/Agronoma can update pest report photos"
ON public.pest_report_photos
FOR UPDATE
USING (is_admin_or_agronoma(auth.uid()))
WITH CHECK (is_admin_or_agronoma(auth.uid()));