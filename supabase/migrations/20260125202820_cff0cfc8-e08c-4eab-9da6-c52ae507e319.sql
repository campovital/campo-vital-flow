-- Fix search_path for calculate_follow_up_date function
CREATE OR REPLACE FUNCTION public.calculate_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follow_up_date IS NULL THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;