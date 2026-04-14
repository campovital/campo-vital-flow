
-- =============================================
-- TRAP TYPES
-- =============================================
CREATE TABLE public.trap_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trap_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trap types"
  ON public.trap_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/Agronoma can manage trap types"
  ON public.trap_types FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- =============================================
-- TRAP TYPE CYCLES (defaults per type)
-- =============================================
CREATE TABLE public.trap_type_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_type_id uuid NOT NULL REFERENCES public.trap_types(id) ON DELETE CASCADE,
  cycle_name text NOT NULL,
  frequency_days_default integer NOT NULL DEFAULT 15,
  product_default text,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trap_type_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trap type cycles"
  ON public.trap_type_cycles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/Agronoma can manage trap type cycles"
  ON public.trap_type_cycles FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- =============================================
-- TRAPS (individual traps in the field)
-- =============================================
CREATE TYPE public.trap_status AS ENUM ('buena', 'deteriorada', 'caida', 'perdida', 'requiere_reposicion');

CREATE TABLE public.traps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  trap_type_id uuid NOT NULL REFERENCES public.trap_types(id),
  lot_id uuid NOT NULL REFERENCES public.lots(id),
  municipality text,
  village text,
  location_detail text,
  installation_date date NOT NULL DEFAULT CURRENT_DATE,
  physical_status public.trap_status NOT NULL DEFAULT 'buena',
  general_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.traps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view traps from assigned farms"
  ON public.traps FOR SELECT TO authenticated
  USING (
    is_admin_or_agronoma(auth.uid())
    OR lot_id IN (
      SELECT l.id FROM lots l
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Admin/Agronoma can manage traps"
  ON public.traps FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- =============================================
-- TRAP CYCLES (editable config per individual trap)
-- =============================================
CREATE TABLE public.trap_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_id uuid NOT NULL REFERENCES public.traps(id) ON DELETE CASCADE,
  trap_type_cycle_id uuid REFERENCES public.trap_type_cycles(id),
  cycle_name text NOT NULL,
  frequency_days integer NOT NULL DEFAULT 15,
  product_name text,
  is_active boolean NOT NULL DEFAULT true,
  uses_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trap_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trap cycles from assigned farms"
  ON public.trap_cycles FOR SELECT TO authenticated
  USING (
    is_admin_or_agronoma(auth.uid())
    OR trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Admin/Agronoma can manage trap cycles"
  ON public.trap_cycles FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- =============================================
-- TRAP EVENTS (activity log)
-- =============================================
CREATE TABLE public.trap_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_id uuid NOT NULL REFERENCES public.traps(id) ON DELETE CASCADE,
  trap_cycle_id uuid REFERENCES public.trap_cycles(id),
  event_type text NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  operator_id uuid REFERENCES public.operators(id),
  operator_name text,
  physical_status public.trap_status,
  product_applied text,
  observations text,
  evidence_url text,
  is_synced boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trap_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trap events from assigned farms"
  ON public.trap_events FOR SELECT TO authenticated
  USING (
    is_admin_or_agronoma(auth.uid())
    OR trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can create trap events in assigned farms"
  ON public.trap_events FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_or_agronoma(auth.uid())
    OR trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Admin/Agronoma can manage trap events"
  ON public.trap_events FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- =============================================
-- TRAP CYCLE STATUS (calculated state)
-- =============================================
CREATE TYPE public.trap_cycle_state AS ENUM ('al_dia', 'proximo', 'vencido');

CREATE TABLE public.trap_cycle_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_id uuid NOT NULL REFERENCES public.traps(id) ON DELETE CASCADE,
  trap_cycle_id uuid NOT NULL REFERENCES public.trap_cycles(id) ON DELETE CASCADE,
  last_date date,
  next_date date,
  status public.trap_cycle_state NOT NULL DEFAULT 'vencido',
  days_remaining integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trap_id, trap_cycle_id)
);

ALTER TABLE public.trap_cycle_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trap cycle status from assigned farms"
  ON public.trap_cycle_status FOR SELECT TO authenticated
  USING (
    is_admin_or_agronoma(auth.uid())
    OR trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Admin/Agronoma can manage trap cycle status"
  ON public.trap_cycle_status FOR ALL TO authenticated
  USING (is_admin_or_agronoma(auth.uid()));

-- Allow any authenticated user to upsert status when recording events
CREATE POLICY "Users can update trap cycle status in assigned farms"
  ON public.trap_cycle_status FOR UPDATE TO authenticated
  USING (
    trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert trap cycle status in assigned farms"
  ON public.trap_cycle_status FOR INSERT TO authenticated
  WITH CHECK (
    trap_id IN (
      SELECT t.id FROM traps t
      JOIN lots l ON l.id = t.lot_id
      WHERE l.farm_id IN (SELECT get_user_farm_ids(auth.uid()))
    )
  );

-- =============================================
-- TRIGGER: auto-update updated_at on trap_cycles
-- =============================================
CREATE TRIGGER update_trap_cycles_updated_at
  BEFORE UPDATE ON public.trap_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
