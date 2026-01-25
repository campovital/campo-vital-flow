-- Create table for pest report status history
CREATE TABLE public.pest_report_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pest_report_id UUID NOT NULL REFERENCES public.pest_reports(id) ON DELETE CASCADE,
    previous_status public.pest_report_status,
    new_status public.pest_report_status NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.pest_report_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view status history"
ON public.pest_report_status_history
FOR SELECT
USING (true);

CREATE POLICY "System can insert status history"
ON public.pest_report_status_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_pest_report_status_history_report_id 
ON public.pest_report_status_history(pest_report_id);

CREATE INDEX idx_pest_report_status_history_changed_at 
ON public.pest_report_status_history(changed_at DESC);

-- Trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_pest_report_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Log the status change
    INSERT INTO public.pest_report_status_history (
        pest_report_id,
        previous_status,
        new_status,
        changed_by,
        changed_at
    ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        auth.uid(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for status changes
CREATE TRIGGER trigger_log_pest_report_status_change
AFTER UPDATE OF status ON public.pest_reports
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_pest_report_status_change();

-- Also log initial creation
CREATE OR REPLACE FUNCTION public.log_pest_report_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.pest_report_status_history (
        pest_report_id,
        previous_status,
        new_status,
        changed_by,
        changed_at
    ) VALUES (
        NEW.id,
        NULL,
        NEW.status,
        auth.uid(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_pest_report_creation
AFTER INSERT ON public.pest_reports
FOR EACH ROW
EXECUTE FUNCTION public.log_pest_report_creation();