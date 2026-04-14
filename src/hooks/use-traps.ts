import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrapType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface TrapTypeCycle {
  id: string;
  trap_type_id: string;
  cycle_name: string;
  frequency_days_default: number;
  product_default: string | null;
  is_mandatory: boolean;
  sort_order: number;
}

export interface Trap {
  id: string;
  code: string;
  trap_type_id: string;
  lot_id: string;
  municipality: string | null;
  village: string | null;
  location_detail: string | null;
  installation_date: string;
  physical_status: string;
  general_notes: string | null;
  is_active: boolean;
  created_at: string;
  trap_types?: TrapType;
  lots?: { name: string };
}

export interface TrapCycle {
  id: string;
  trap_id: string;
  trap_type_cycle_id: string | null;
  cycle_name: string;
  frequency_days: number;
  product_name: string | null;
  is_active: boolean;
  uses_default: boolean;
}

export interface TrapCycleStatus {
  id: string;
  trap_id: string;
  trap_cycle_id: string;
  last_date: string | null;
  next_date: string | null;
  status: "al_dia" | "proximo" | "vencido";
  days_remaining: number | null;
}

export interface TrapEvent {
  id: string;
  trap_id: string;
  trap_cycle_id: string | null;
  event_type: string;
  event_date: string;
  operator_id: string | null;
  operator_name: string | null;
  physical_status: string | null;
  product_applied: string | null;
  observations: string | null;
  evidence_url: string | null;
  created_at: string;
}

export function useTrapTypes() {
  return useQuery({
    queryKey: ["trap-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trap_types")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as TrapType[];
    },
  });
}

export function useTrapTypeCycles(trapTypeId?: string) {
  return useQuery({
    queryKey: ["trap-type-cycles", trapTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trap_type_cycles")
        .select("*")
        .eq("trap_type_id", trapTypeId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as TrapTypeCycle[];
    },
    enabled: !!trapTypeId,
  });
}

export function useTraps() {
  return useQuery({
    queryKey: ["traps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traps")
        .select("*, trap_types(id, name), lots(name)")
        .order("code");
      if (error) throw error;
      return data as Trap[];
    },
  });
}

export function useTrapCycles(trapId?: string) {
  return useQuery({
    queryKey: ["trap-cycles", trapId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trap_cycles")
        .select("*")
        .eq("trap_id", trapId!)
        .order("cycle_name");
      if (error) throw error;
      return data as TrapCycle[];
    },
    enabled: !!trapId,
  });
}

export function useTrapCycleStatuses(trapIds?: string[]) {
  return useQuery({
    queryKey: ["trap-cycle-statuses", trapIds],
    queryFn: async () => {
      if (!trapIds || trapIds.length === 0) return [];
      const { data, error } = await supabase
        .from("trap_cycle_status")
        .select("*")
        .in("trap_id", trapIds);
      if (error) throw error;
      return data as TrapCycleStatus[];
    },
    enabled: !!trapIds && trapIds.length > 0,
  });
}

export function useTrapEvents(filters?: { trapId?: string; lotId?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["trap-events", filters],
    queryFn: async () => {
      let query = supabase
        .from("trap_events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(200);
      if (filters?.trapId) query = query.eq("trap_id", filters.trapId);
      if (filters?.dateFrom) query = query.gte("event_date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("event_date", filters.dateTo);
      const { data, error } = await query;
      if (error) throw error;
      return data as TrapEvent[];
    },
  });
}

export function useCreateTrap() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (trapData: {
      code: string;
      trap_type_id: string;
      lot_id: string;
      municipality?: string;
      village?: string;
      location_detail?: string;
      installation_date: string;
      general_notes?: string;
    }) => {
      // 1. Create the trap
      const { data: trap, error: trapError } = await supabase
        .from("traps")
        .insert(trapData)
        .select("id")
        .single();
      if (trapError) throw trapError;

      // 2. Copy default cycles from trap_type_cycles
      const { data: defaultCycles, error: cyclesError } = await supabase
        .from("trap_type_cycles")
        .select("*")
        .eq("trap_type_id", trapData.trap_type_id)
        .eq("is_active", true);
      if (cyclesError) throw cyclesError;

      if (defaultCycles && defaultCycles.length > 0) {
        const cyclesToInsert = defaultCycles.map((dc) => ({
          trap_id: trap.id,
          trap_type_cycle_id: dc.id,
          cycle_name: dc.cycle_name,
          frequency_days: dc.frequency_days_default,
          product_name: dc.product_default,
          is_active: true,
          uses_default: true,
        }));

        const { data: insertedCycles, error: insertError } = await supabase
          .from("trap_cycles")
          .insert(cyclesToInsert)
          .select("id");
        if (insertError) throw insertError;

        // 3. Initialize cycle statuses
        if (insertedCycles) {
          const statusesToInsert = insertedCycles.map((c) => ({
            trap_id: trap.id,
            trap_cycle_id: c.id,
            last_date: null,
            next_date: null,
            status: "vencido" as const,
            days_remaining: 0,
          }));

          await supabase.from("trap_cycle_status").insert(statusesToInsert);
        }
      }

      return trap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["traps"] });
      queryClient.invalidateQueries({ queryKey: ["trap-cycle-statuses"] });
      toast({ title: "Trampa creada", description: "La trampa y sus ciclos fueron configurados" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useRegisterTrapEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventData: {
      trap_id: string;
      trap_cycle_id?: string;
      event_type: string;
      event_date: string;
      operator_name?: string;
      physical_status?: string;
      product_applied?: string;
      observations?: string;
      evidence_url?: string;
    }) => {
      // 1. Insert event
      const insertPayload: any = { ...eventData };
      if (insertPayload.physical_status) {
        insertPayload.physical_status = insertPayload.physical_status as "buena" | "deteriorada" | "caida" | "perdida" | "requiere_reposicion";
      }
      const { error: eventError } = await supabase
        .from("trap_events")
        .insert([insertPayload]);
      if (eventError) throw eventError;

      // 2. Update cycle status if linked to a cycle
      if (eventData.trap_cycle_id) {
        const { data: cycle } = await supabase
          .from("trap_cycles")
          .select("frequency_days")
          .eq("id", eventData.trap_cycle_id)
          .single();

        if (cycle) {
          const eventDate = new Date(eventData.event_date);
          const nextDate = new Date(eventDate);
          nextDate.setDate(nextDate.getDate() + cycle.frequency_days);
          const today = new Date();
          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let status: "al_dia" | "proximo" | "vencido" = "al_dia";
          if (diffDays <= 0) status = "vencido";
          else if (diffDays <= 2) status = "proximo";

          await supabase
            .from("trap_cycle_status")
            .upsert({
              trap_id: eventData.trap_id,
              trap_cycle_id: eventData.trap_cycle_id,
              last_date: eventData.event_date.split("T")[0],
              next_date: nextDate.toISOString().split("T")[0],
              status,
              days_remaining: diffDays,
              updated_at: new Date().toISOString(),
            }, { onConflict: "trap_id,trap_cycle_id" });
        }
      }

      // 3. Update trap physical status if provided
      if (eventData.physical_status) {
        await supabase
          .from("traps")
          .update({ physical_status: eventData.physical_status as "buena" | "deteriorada" | "caida" | "perdida" | "requiere_reposicion" })
          .eq("id", eventData.trap_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trap-events"] });
      queryClient.invalidateQueries({ queryKey: ["trap-cycle-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["traps"] });
      toast({ title: "Actividad registrada", description: "El evento fue guardado correctamente" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateTrapCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cycleId, updates }: { cycleId: string; updates: Partial<TrapCycle> }) => {
      const { error } = await supabase
        .from("trap_cycles")
        .update({ ...updates, uses_default: false })
        .eq("id", cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trap-cycles"] });
      toast({ title: "Ciclo actualizado" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
