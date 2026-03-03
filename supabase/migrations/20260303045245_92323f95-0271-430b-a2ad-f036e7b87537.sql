-- Allow users with farm access to view operators from their assigned farms
CREATE POLICY "Users can view operators from assigned farms"
ON public.operators
FOR SELECT
TO authenticated
USING (
  is_admin_or_agronoma(auth.uid()) 
  OR (farm_id IN (SELECT get_user_farm_ids(auth.uid())))
);
