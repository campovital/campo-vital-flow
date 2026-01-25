-- =============================================
-- CAMPOVITAL GULUPA - SCHEMA COMPLETO
-- =============================================

-- 1. ENUM para roles de aplicación
CREATE TYPE public.app_role AS ENUM ('admin', 'agronoma', 'operario', 'consulta');

-- 2. ENUM para estados de protocolo
CREATE TYPE public.protocol_status AS ENUM ('draft', 'published', 'archived');

-- 3. ENUM para tipos de regla de programación
CREATE TYPE public.schedule_rule_type AS ENUM ('DATE_RANGE', 'ISO_WEEK', 'SEASON', 'PHENO_WEEK', 'DEFAULT');

-- 4. ENUM para épocas del año
CREATE TYPE public.season_type AS ENUM ('lluvias', 'sequia', 'invierno', 'verano');

-- 5. ENUM para categorías de protocolo
CREATE TYPE public.protocol_category AS ENUM ('fenologia', 'epoca', 'sanitario', 'nutricion', 'otro');

-- 6. ENUM para estado de aplicación
CREATE TYPE public.application_status AS ENUM ('ejecutada', 'no_ejecutada', 'ejecutada_con_novedad');

-- =============================================
-- TABLAS BASE
-- =============================================

-- Perfiles de usuario
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'operario',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de roles de usuario (para verificación segura)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Fincas
CREATE TABLE public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    total_hectares DECIMAL(10,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lotes
CREATE TABLE public.lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hectares DECIMAL(10,2),
    plant_count INTEGER,
    planting_date DATE,
    phenological_week INTEGER DEFAULT 1,
    current_season season_type,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Operarios (lista pre-registrada para selección rápida)
CREATE TABLE public.operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    identification TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    farm_id UUID REFERENCES public.farms(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INVENTARIO
-- =============================================

-- Productos de inventario
CREATE TABLE public.inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active_ingredient TEXT,
    unit TEXT NOT NULL DEFAULT 'L',
    default_withdrawal_days INTEGER DEFAULT 0,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lotes/Batches de productos
CREATE TABLE public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
    batch_number TEXT,
    supplier TEXT,
    purchase_date DATE,
    expiry_date DATE,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PROTOCOLOS (con versionado inmutable)
-- =============================================

-- Protocolos base
CREATE TABLE public.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category protocol_category NOT NULL DEFAULT 'otro',
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Versiones de protocolo (inmutables una vez publicadas)
CREATE TABLE public.protocol_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    status protocol_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(protocol_id, version_number)
);

-- Pasos del protocolo (ordenados)
CREATE TABLE public.protocol_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_version_id UUID NOT NULL REFERENCES public.protocol_versions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Componentes/productos del protocolo
CREATE TABLE public.protocol_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_version_id UUID NOT NULL REFERENCES public.protocol_versions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.inventory_products(id),
    dose_amount DECIMAL(10,4) NOT NULL,
    dose_unit TEXT NOT NULL DEFAULT 'ml',
    dose_base TEXT NOT NULL DEFAULT 'bomba', -- planta, bomba, ha
    withdrawal_days INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PROGRAMADOR DE REGLAS
-- =============================================

-- Reglas de programación
CREATE TABLE public.schedule_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rule_type schedule_rule_type NOT NULL,
    protocol_version_id UUID NOT NULL REFERENCES public.protocol_versions(id),
    lot_id UUID REFERENCES public.lots(id), -- NULL = aplica a toda la finca
    farm_id UUID REFERENCES public.farms(id),
    -- Parámetros según tipo
    date_start DATE,
    date_end DATE,
    iso_week_start INTEGER,
    iso_week_end INTEGER,
    season season_type,
    pheno_week_start INTEGER,
    pheno_week_end INTEGER,
    priority INTEGER NOT NULL DEFAULT 100, -- menor = mayor prioridad
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- APLICACIONES
-- =============================================

-- Aplicaciones realizadas
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES public.lots(id),
    operator_id UUID NOT NULL REFERENCES public.operators(id),
    protocol_version_id UUID NOT NULL REFERENCES public.protocol_versions(id),
    schedule_rule_id UUID REFERENCES public.schedule_rules(id),
    status application_status NOT NULL,
    device_time TIMESTAMPTZ NOT NULL,
    server_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    plants_covered INTEGER,
    pumps_used DECIMAL(10,2),
    notes TEXT,
    issue_reason TEXT,
    photo_url TEXT,
    pdf_url TEXT,
    reason_explanation TEXT, -- Por qué se eligió esta mezcla
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Detalle de productos usados (snapshot para auditoría)
CREATE TABLE public.application_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.inventory_products(id),
    batch_id UUID REFERENCES public.inventory_batches(id),
    quantity_used DECIMAL(10,4) NOT NULL,
    unit_cost_snapshot DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- COSECHA
-- =============================================

CREATE TABLE public.harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES public.lots(id),
    harvest_date DATE NOT NULL,
    total_kg DECIMAL(10,2) NOT NULL,
    exportable_kg DECIMAL(10,2) DEFAULT 0,
    rejected_kg DECIMAL(10,2) DEFAULT 0,
    recorded_by UUID REFERENCES auth.users(id),
    operator_id UUID REFERENCES public.operators(id),
    notes TEXT,
    override_pc BOOLEAN DEFAULT false,
    override_reason TEXT,
    override_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- REPORTES SANITARIOS
-- =============================================

CREATE TABLE public.pest_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES public.lots(id),
    reported_by UUID REFERENCES auth.users(id),
    operator_id UUID REFERENCES public.operators(id),
    pest_type TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    incidence_percent DECIMAL(5,2),
    photo_url TEXT,
    gps_lat DECIMAL(10,8),
    gps_lng DECIMAL(11,8),
    notes TEXT,
    follow_up_date DATE,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AUDITORÍA
-- =============================================

CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FUNCIONES HELPER PARA RLS
-- =============================================

-- Verificar si usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Verificar si es admin o agrónoma
CREATE OR REPLACE FUNCTION public.is_admin_or_agronoma(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'agronoma')
    )
$$;

-- Función para obtener mezcla sugerida
CREATE OR REPLACE FUNCTION public.get_suggested_mix(p_lot_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lot RECORD;
    v_rule RECORD;
    v_protocol_version RECORD;
    v_steps JSONB;
    v_components JSONB;
    v_reason TEXT;
    v_iso_week INTEGER;
BEGIN
    -- Obtener info del lote
    SELECT * INTO v_lot FROM public.lots WHERE id = p_lot_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Lote no encontrado');
    END IF;
    
    -- Calcular semana ISO
    v_iso_week := EXTRACT(WEEK FROM p_date);
    
    -- Buscar regla aplicable (por prioridad)
    SELECT sr.* INTO v_rule
    FROM public.schedule_rules sr
    WHERE sr.is_active = true
      AND (sr.lot_id = p_lot_id OR (sr.lot_id IS NULL AND sr.farm_id = v_lot.farm_id))
      AND (
        (sr.rule_type = 'DATE_RANGE' AND p_date BETWEEN sr.date_start AND sr.date_end)
        OR (sr.rule_type = 'ISO_WEEK' AND v_iso_week BETWEEN sr.iso_week_start AND sr.iso_week_end)
        OR (sr.rule_type = 'SEASON' AND sr.season = v_lot.current_season)
        OR (sr.rule_type = 'PHENO_WEEK' AND v_lot.phenological_week BETWEEN sr.pheno_week_start AND sr.pheno_week_end)
        OR (sr.rule_type = 'DEFAULT')
      )
    ORDER BY 
        CASE sr.rule_type
            WHEN 'DATE_RANGE' THEN 1
            WHEN 'ISO_WEEK' THEN 2
            WHEN 'SEASON' THEN 3
            WHEN 'PHENO_WEEK' THEN 4
            WHEN 'DEFAULT' THEN 5
        END,
        CASE WHEN sr.lot_id IS NOT NULL THEN 0 ELSE 1 END,
        sr.priority,
        sr.created_at
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'No hay regla aplicable para esta fecha');
    END IF;
    
    -- Construir razón
    v_reason := format('Regla: %s (%s)', v_rule.name, v_rule.rule_type);
    IF v_rule.lot_id IS NOT NULL THEN
        v_reason := v_reason || ' [específica para lote]';
    ELSE
        v_reason := v_reason || ' [aplica a finca]';
    END IF;
    
    -- Obtener versión del protocolo
    SELECT pv.*, p.name as protocol_name, p.category
    INTO v_protocol_version
    FROM public.protocol_versions pv
    JOIN public.protocols p ON p.id = pv.protocol_id
    WHERE pv.id = v_rule.protocol_version_id;
    
    -- Obtener pasos
    SELECT jsonb_agg(
        jsonb_build_object(
            'order', ps.step_order,
            'instruction', ps.instruction,
            'is_required', ps.is_required
        ) ORDER BY ps.step_order
    ) INTO v_steps
    FROM public.protocol_steps ps
    WHERE ps.protocol_version_id = v_rule.protocol_version_id;
    
    -- Obtener componentes
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', pc.product_id,
            'product_name', ip.name,
            'dose_amount', pc.dose_amount,
            'dose_unit', pc.dose_unit,
            'dose_base', pc.dose_base,
            'withdrawal_days', pc.withdrawal_days
        )
    ) INTO v_components
    FROM public.protocol_components pc
    JOIN public.inventory_products ip ON ip.id = pc.product_id
    WHERE pc.protocol_version_id = v_rule.protocol_version_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'rule_id', v_rule.id,
        'protocol_version_id', v_protocol_version.id,
        'protocol_name', v_protocol_version.protocol_name,
        'protocol_category', v_protocol_version.category,
        'version_number', v_protocol_version.version_number,
        'reason', v_reason,
        'iso_week', v_iso_week,
        'phenological_week', v_lot.phenological_week,
        'current_season', v_lot.current_season,
        'steps', COALESCE(v_steps, '[]'::jsonb),
        'components', COALESCE(v_components, '[]'::jsonb)
    );
END;
$$;

-- Función para verificar si se puede cosechar
CREATE OR REPLACE FUNCTION public.can_harvest(p_lot_id UUID, p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_blocking_products JSONB;
    v_release_date DATE;
BEGIN
    -- Buscar productos con PC vigente
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'product_name', ip.name,
                'application_date', a.device_time::date,
                'withdrawal_days', pc.withdrawal_days,
                'release_date', (a.device_time::date + pc.withdrawal_days)
            )
        ),
        MAX(a.device_time::date + pc.withdrawal_days)
    INTO v_blocking_products, v_release_date
    FROM public.applications a
    JOIN public.application_products ap ON ap.application_id = a.id
    JOIN public.protocol_components pc ON pc.product_id = ap.product_id 
        AND pc.protocol_version_id = a.protocol_version_id
    JOIN public.inventory_products ip ON ip.id = ap.product_id
    WHERE a.lot_id = p_lot_id
      AND a.status IN ('ejecutada', 'ejecutada_con_novedad')
      AND (a.device_time::date + pc.withdrawal_days) > p_date;
    
    IF v_blocking_products IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'message', 'Sin restricciones de carencia'
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'release_date', v_release_date,
            'blocking_products', v_blocking_products,
            'message', format('Carencia vigente hasta %s', v_release_date)
        );
    END IF;
END;
$$;

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON public.lots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_products_updated_at BEFORE UPDATE ON public.inventory_products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_batches_updated_at BEFORE UPDATE ON public.inventory_batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON public.protocols
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_rules_updated_at BEFORE UPDATE ON public.schedule_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pest_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Policies para user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Policies para farms (todos los autenticados pueden ver)
CREATE POLICY "Authenticated users can view farms" ON public.farms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage farms" ON public.farms FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para lots
CREATE POLICY "Authenticated users can view lots" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage lots" ON public.lots FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para operators
CREATE POLICY "Authenticated users can view operators" ON public.operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage operators" ON public.operators FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para inventory
CREATE POLICY "Authenticated users can view products" ON public.inventory_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage products" ON public.inventory_products FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can view batches" ON public.inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage batches" ON public.inventory_batches FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para protocols
CREATE POLICY "Authenticated users can view protocols" ON public.protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage protocols" ON public.protocols FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can view versions" ON public.protocol_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage versions" ON public.protocol_versions FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can view steps" ON public.protocol_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage steps" ON public.protocol_steps FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can view components" ON public.protocol_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage components" ON public.protocol_components FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para schedule_rules
CREATE POLICY "Authenticated users can view rules" ON public.schedule_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Agronoma can manage rules" ON public.schedule_rules FOR ALL TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para applications (operarios pueden crear)
CREATE POLICY "Authenticated users can view applications" ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/Agronoma can update applications" ON public.applications FOR UPDATE TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can view application products" ON public.application_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create application products" ON public.application_products FOR INSERT TO authenticated WITH CHECK (true);

-- Policies para harvests
CREATE POLICY "Authenticated users can view harvests" ON public.harvests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create harvests" ON public.harvests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/Agronoma can update harvests" ON public.harvests FOR UPDATE TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para pest_reports
CREATE POLICY "Authenticated users can view pest reports" ON public.pest_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create pest reports" ON public.pest_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin/Agronoma can update pest reports" ON public.pest_reports FOR UPDATE TO authenticated
    USING (public.is_admin_or_agronoma(auth.uid()));

-- Policies para audit_log (solo lectura)
CREATE POLICY "Authenticated users can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'operario'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operario');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();