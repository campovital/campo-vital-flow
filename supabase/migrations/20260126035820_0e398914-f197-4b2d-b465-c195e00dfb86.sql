-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');

-- Task types catalog
CREATE TABLE public.task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    estimated_hours NUMERIC,
    requires_lot BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on task_types
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_types
CREATE POLICY "Authenticated users can view task types"
ON public.task_types FOR SELECT
USING (true);

CREATE POLICY "Admin/Agronoma can manage task types"
ON public.task_types FOR ALL
USING (is_admin_or_agronoma(auth.uid()));

-- Main tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type_id UUID REFERENCES public.task_types(id) NOT NULL,
    lot_id UUID REFERENCES public.lots(id),
    assigned_to UUID REFERENCES public.operators(id),
    assigned_by UUID,
    scheduled_date DATE NOT NULL,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    status task_status DEFAULT 'pendiente',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    hours_worked NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN started_at IS NOT NULL AND completed_at IS NOT NULL 
            THEN ROUND(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600, 2)
            ELSE NULL 
        END
    ) STORED,
    notes TEXT,
    completion_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Authenticated users can view tasks"
ON public.tasks FOR SELECT
USING (true);

CREATE POLICY "Admin/Agronoma can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (is_admin_or_agronoma(auth.uid()));

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks FOR UPDATE
USING (true);

CREATE POLICY "Admin/Agronoma can delete tasks"
ON public.tasks FOR DELETE
USING (is_admin_or_agronoma(auth.uid()));

-- Trigger for updated_at on task_types
CREATE TRIGGER update_task_types_updated_at
BEFORE UPDATE ON public.task_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common task types
INSERT INTO public.task_types (name, description, estimated_hours, requires_lot) VALUES
('Fumigación', 'Aplicación de productos fitosanitarios', 4, true),
('Poda', 'Poda de formación o mantenimiento', 6, true),
('Cosecha', 'Recolección de fruta', 8, true),
('Fertilización', 'Aplicación de fertilizantes', 3, true),
('Limpieza de lote', 'Limpieza general del lote', 4, true),
('Riego manual', 'Riego manual de plantas', 2, true),
('Tutorado', 'Instalación o mantenimiento de tutores', 5, true),
('Monitoreo sanitario', 'Inspección de plagas y enfermedades', 2, true),
('Mantenimiento general', 'Tareas varias de mantenimiento', 4, false),
('Capacitación', 'Sesiones de capacitación para personal', 2, false);

-- Add tareas module to app_module enum
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'tareas';

-- Seed permissions for tareas module
INSERT INTO public.role_permissions (role, module, action) VALUES
('admin', 'tareas', 'view'),
('admin', 'tareas', 'create'),
('admin', 'tareas', 'edit'),
('admin', 'tareas', 'delete'),
('admin', 'tareas', 'approve'),
('admin', 'tareas', 'export'),
('agronoma', 'tareas', 'view'),
('agronoma', 'tareas', 'create'),
('agronoma', 'tareas', 'edit'),
('agronoma', 'tareas', 'delete'),
('agronoma', 'tareas', 'export'),
('operario', 'tareas', 'view'),
('operario', 'tareas', 'edit'),
('consulta', 'tareas', 'view')
ON CONFLICT DO NOTHING;