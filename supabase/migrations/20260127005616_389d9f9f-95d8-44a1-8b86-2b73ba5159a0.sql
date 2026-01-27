-- Fix the overly permissive UPDATE policy on tasks table
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;

CREATE POLICY "Users can update tasks in assigned farms"
ON public.tasks FOR UPDATE
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IS NULL
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Fix the system insert policy on pest_report_status_history 
DROP POLICY IF EXISTS "System can insert status history" ON public.pest_report_status_history;

CREATE POLICY "Users can insert status history for assigned farms"
ON public.pest_report_status_history FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    pest_report_id IN (
        SELECT pr.id FROM public.pest_reports pr
        JOIN public.lots l ON l.id = pr.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Fix audit_log insert policy
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;

CREATE POLICY "Authenticated users can insert audit log"
ON public.audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);