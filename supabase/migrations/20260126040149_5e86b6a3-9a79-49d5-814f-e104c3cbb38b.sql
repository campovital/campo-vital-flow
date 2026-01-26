-- Add labor cost fields to operators
ALTER TABLE public.operators 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'COP';

-- Create price history table for products
CREATE TABLE public.product_price_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for price history
CREATE POLICY "Authenticated users can view price history"
ON public.product_price_history FOR SELECT
USING (true);

CREATE POLICY "Admin/Agronoma can manage price history"
ON public.product_price_history FOR ALL
USING (is_admin_or_agronoma(auth.uid()));

-- Add cost fields to applications
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS total_product_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_labor_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC GENERATED ALWAYS AS (
    COALESCE(total_product_cost, 0) + COALESCE(total_labor_cost, 0)
) STORED,
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC DEFAULT 0;

-- Add cost snapshot to application_products (already has unit_cost_snapshot, ensure it's used)
-- The unit_cost_snapshot already exists, we'll use it

-- Create function to get current product price
CREATE OR REPLACE FUNCTION public.get_current_product_price(p_product_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT unit_price 
    FROM public.product_price_history
    WHERE product_id = p_product_id
      AND effective_date <= CURRENT_DATE
    ORDER BY effective_date DESC, created_at DESC
    LIMIT 1
$$;

-- Create function to calculate application costs
CREATE OR REPLACE FUNCTION public.calculate_application_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_cost NUMERIC := 0;
    v_labor_cost NUMERIC := 0;
    v_operator_rate NUMERIC;
    v_labor_hours NUMERIC;
BEGIN
    -- Calculate total product cost from application_products
    SELECT COALESCE(SUM(ap.quantity_used * COALESCE(ap.unit_cost_snapshot, get_current_product_price(ap.product_id), 0)), 0)
    INTO v_product_cost
    FROM public.application_products ap
    WHERE ap.application_id = NEW.id;
    
    -- Get operator hourly rate
    SELECT COALESCE(hourly_rate, 0) INTO v_operator_rate
    FROM public.operators
    WHERE id = NEW.operator_id;
    
    -- Calculate labor cost (labor_hours * hourly_rate)
    v_labor_hours := COALESCE(NEW.labor_hours, 0);
    v_labor_cost := v_labor_hours * v_operator_rate;
    
    -- Update the application with calculated costs
    NEW.total_product_cost := v_product_cost;
    NEW.total_labor_cost := v_labor_cost;
    
    RETURN NEW;
END;
$$;

-- Create trigger for cost calculation on applications
DROP TRIGGER IF EXISTS trigger_calculate_application_costs ON public.applications;
CREATE TRIGGER trigger_calculate_application_costs
BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.calculate_application_costs();

-- Add costos to app_module enum
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'costos';

-- Insert default permissions for costos module
INSERT INTO public.role_permissions (role, module, action) VALUES
    ('admin', 'costos', 'view'),
    ('admin', 'costos', 'create'),
    ('admin', 'costos', 'edit'),
    ('admin', 'costos', 'delete'),
    ('admin', 'costos', 'export'),
    ('agronoma', 'costos', 'view'),
    ('agronoma', 'costos', 'create'),
    ('agronoma', 'costos', 'edit'),
    ('agronoma', 'costos', 'export'),
    ('consulta', 'costos', 'view')
ON CONFLICT DO NOTHING;