-- Create user_farms table to map users to their assigned farms
CREATE TABLE public.user_farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, farm_id)
);

-- Enable RLS
ALTER TABLE public.user_farms ENABLE ROW LEVEL SECURITY;

-- Admins can manage user_farms assignments
CREATE POLICY "Admins can manage user_farms"
ON public.user_farms FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own farm assignments
CREATE POLICY "Users can view own farm assignments"
ON public.user_farms FOR SELECT
USING (user_id = auth.uid());

-- Create security definer function to get user's farm IDs
CREATE OR REPLACE FUNCTION public.get_user_farm_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT farm_id FROM public.user_farms WHERE user_id = _user_id
$$;

-- Create function to check if user has access to a specific farm
CREATE OR REPLACE FUNCTION public.user_has_farm_access(_user_id UUID, _farm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_farms
        WHERE user_id = _user_id AND farm_id = _farm_id
    )
$$;

-- Update farms table policies for farm-scoped access
DROP POLICY IF EXISTS "Authenticated users can view farms" ON public.farms;

CREATE POLICY "Users can view assigned farms or admins see all"
ON public.farms FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    id IN (SELECT get_user_farm_ids(auth.uid()))
);

-- Update lots table policies
DROP POLICY IF EXISTS "Authenticated users can view lots" ON public.lots;

CREATE POLICY "Users can view lots from assigned farms or admins see all"
ON public.lots FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    farm_id IN (SELECT get_user_farm_ids(auth.uid()))
);

-- Update applications table policies
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.applications;

CREATE POLICY "Users can view applications from assigned farms"
ON public.applications FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update harvests table policies
DROP POLICY IF EXISTS "Authenticated users can view harvests" ON public.harvests;

CREATE POLICY "Users can view harvests from assigned farms"
ON public.harvests FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update pest_reports table policies
DROP POLICY IF EXISTS "Authenticated users can view pest reports" ON public.pest_reports;

CREATE POLICY "Users can view pest reports from assigned farms"
ON public.pest_reports FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update pest_report_photos policies
DROP POLICY IF EXISTS "Authenticated users can view pest report photos" ON public.pest_report_photos;

CREATE POLICY "Users can view pest report photos from assigned farms"
ON public.pest_report_photos FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    pest_report_id IN (
        SELECT pr.id FROM public.pest_reports pr
        JOIN public.lots l ON l.id = pr.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update pest_report_status_history policies
DROP POLICY IF EXISTS "Authenticated users can view status history" ON public.pest_report_status_history;

CREATE POLICY "Users can view status history from assigned farms"
ON public.pest_report_status_history FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    pest_report_id IN (
        SELECT pr.id FROM public.pest_reports pr
        JOIN public.lots l ON l.id = pr.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update tasks table policies
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;

CREATE POLICY "Users can view tasks from assigned farms"
ON public.tasks FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IS NULL -- Tasks without lot are visible
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update application_products policies
DROP POLICY IF EXISTS "Authenticated users can view application products" ON public.application_products;

CREATE POLICY "Users can view application products from assigned farms"
ON public.application_products FOR SELECT
USING (
    is_admin_or_agronoma(auth.uid())
    OR
    application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.lots l ON l.id = a.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update INSERT policies to respect farm scope
DROP POLICY IF EXISTS "Authenticated users can create applications" ON public.applications;

CREATE POLICY "Users can create applications in assigned farms"
ON public.applications FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Authenticated users can create harvests" ON public.harvests;

CREATE POLICY "Users can create harvests in assigned farms"
ON public.harvests FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Authenticated users can create pest reports" ON public.pest_reports;

CREATE POLICY "Users can create pest reports in assigned farms"
ON public.pest_reports FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    lot_id IN (
        SELECT id FROM public.lots 
        WHERE farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Authenticated users can create pest report photos" ON public.pest_report_photos;

CREATE POLICY "Users can create pest report photos in assigned farms"
ON public.pest_report_photos FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    pest_report_id IN (
        SELECT pr.id FROM public.pest_reports pr
        JOIN public.lots l ON l.id = pr.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

DROP POLICY IF EXISTS "Authenticated users can create application products" ON public.application_products;

CREATE POLICY "Users can create application products in assigned farms"
ON public.application_products FOR INSERT
WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR
    application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.lots l ON l.id = a.lot_id
        WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
);

-- Update operators_basic view to respect farm scope (view already filters sensitive data)
-- The view will inherit the base table's RLS

-- Create index for performance
CREATE INDEX idx_user_farms_user_id ON public.user_farms(user_id);
CREATE INDEX idx_user_farms_farm_id ON public.user_farms(farm_id);