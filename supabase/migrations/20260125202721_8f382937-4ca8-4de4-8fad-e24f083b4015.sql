-- Create enum for pest report status
CREATE TYPE public.pest_report_status AS ENUM ('pendiente', 'en_tratamiento', 'resuelto');

-- Add new columns for tracking
ALTER TABLE public.pest_reports
ADD COLUMN status public.pest_report_status NOT NULL DEFAULT 'pendiente',
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN resolved_by UUID,
ADD COLUMN treatment_started_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing data: set resolved reports to 'resuelto' status
UPDATE public.pest_reports 
SET status = 'resuelto', resolved_at = created_at 
WHERE is_resolved = true;

-- Create function to auto-calculate follow_up_date based on severity
CREATE OR REPLACE FUNCTION public.calculate_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set follow_up_date if not already set
    IF NEW.follow_up_date IS NULL THEN
        -- Higher severity = shorter follow-up time
        CASE NEW.severity
            WHEN 5 THEN NEW.follow_up_date := CURRENT_DATE + INTERVAL '2 days';
            WHEN 4 THEN NEW.follow_up_date := CURRENT_DATE + INTERVAL '4 days';
            WHEN 3 THEN NEW.follow_up_date := CURRENT_DATE + INTERVAL '7 days';
            WHEN 2 THEN NEW.follow_up_date := CURRENT_DATE + INTERVAL '14 days';
            ELSE NEW.follow_up_date := CURRENT_DATE + INTERVAL '21 days';
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto follow-up date
CREATE TRIGGER set_follow_up_date
BEFORE INSERT ON public.pest_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_follow_up_date();

-- Create function to handle status transitions
CREATE OR REPLACE FUNCTION public.handle_pest_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'en_tratamiento', set treatment_started_at
    IF NEW.status = 'en_tratamiento' AND OLD.status = 'pendiente' THEN
        NEW.treatment_started_at := NOW();
    END IF;
    
    -- When status changes to 'resuelto', set resolved fields
    IF NEW.status = 'resuelto' AND OLD.status != 'resuelto' THEN
        NEW.is_resolved := true;
        NEW.resolved_at := NOW();
        NEW.resolved_by := auth.uid();
    END IF;
    
    -- If changing back from resuelto, clear resolved fields
    IF NEW.status != 'resuelto' AND OLD.status = 'resuelto' THEN
        NEW.is_resolved := false;
        NEW.resolved_at := NULL;
        NEW.resolved_by := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status changes
CREATE TRIGGER handle_status_change
BEFORE UPDATE ON public.pest_reports
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_pest_report_status_change();