-- Modify handle_new_user to auto-assign new users to a default farm
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_default_farm_id uuid;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'operario'
    );
    
    -- Create default role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operario');
    
    -- Auto-assign to the first available farm (if any exist)
    SELECT id INTO v_default_farm_id
    FROM public.farms
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_default_farm_id IS NOT NULL THEN
        INSERT INTO public.user_farms (user_id, farm_id)
        VALUES (NEW.id, v_default_farm_id);
    END IF;
    
    RETURN NEW;
END;
$$;