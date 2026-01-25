export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      application_products: {
        Row: {
          application_id: string
          batch_id: string | null
          created_at: string
          id: string
          product_id: string
          quantity_used: number
          unit_cost_snapshot: number | null
        }
        Insert: {
          application_id: string
          batch_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity_used: number
          unit_cost_snapshot?: number | null
        }
        Update: {
          application_id?: string
          batch_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity_used?: number
          unit_cost_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "application_products_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_products_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          device_time: string
          id: string
          issue_reason: string | null
          lot_id: string
          notes: string | null
          operator_id: string
          pdf_url: string | null
          photo_url: string | null
          plants_covered: number | null
          protocol_version_id: string
          pumps_used: number | null
          reason_explanation: string | null
          schedule_rule_id: string | null
          server_time: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          created_at?: string
          device_time: string
          id?: string
          issue_reason?: string | null
          lot_id: string
          notes?: string | null
          operator_id: string
          pdf_url?: string | null
          photo_url?: string | null
          plants_covered?: number | null
          protocol_version_id: string
          pumps_used?: number | null
          reason_explanation?: string | null
          schedule_rule_id?: string | null
          server_time?: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          created_at?: string
          device_time?: string
          id?: string
          issue_reason?: string | null
          lot_id?: string
          notes?: string | null
          operator_id?: string
          pdf_url?: string | null
          photo_url?: string | null
          plants_covered?: number | null
          protocol_version_id?: string
          pumps_used?: number | null
          reason_explanation?: string | null
          schedule_rule_id?: string | null
          server_time?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_protocol_version_id_fkey"
            columns: ["protocol_version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_schedule_rule_id_fkey"
            columns: ["schedule_rule_id"]
            isOneToOne: false
            referencedRelation: "schedule_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_table: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_table: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_table?: string
          user_id?: string | null
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          name: string
          total_hectares: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          total_hectares?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          total_hectares?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      harvests: {
        Row: {
          created_at: string
          exportable_kg: number | null
          harvest_date: string
          id: string
          lot_id: string
          notes: string | null
          operator_id: string | null
          override_by: string | null
          override_pc: boolean | null
          override_reason: string | null
          recorded_by: string | null
          rejected_kg: number | null
          total_kg: number
        }
        Insert: {
          created_at?: string
          exportable_kg?: number | null
          harvest_date: string
          id?: string
          lot_id: string
          notes?: string | null
          operator_id?: string | null
          override_by?: string | null
          override_pc?: boolean | null
          override_reason?: string | null
          recorded_by?: string | null
          rejected_kg?: number | null
          total_kg: number
        }
        Update: {
          created_at?: string
          exportable_kg?: number | null
          harvest_date?: string
          id?: string
          lot_id?: string
          notes?: string | null
          operator_id?: string | null
          override_by?: string | null
          override_pc?: boolean | null
          override_reason?: string | null
          recorded_by?: string | null
          rejected_kg?: number | null
          total_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "harvests_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          product_id: string
          purchase_date: string | null
          quantity: number
          supplier: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id: string
          purchase_date?: string | null
          quantity?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string
          purchase_date?: string | null
          quantity?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          active_ingredient: string | null
          category: string | null
          created_at: string
          default_withdrawal_days: number | null
          id: string
          is_active: boolean | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          active_ingredient?: string | null
          category?: string | null
          created_at?: string
          default_withdrawal_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active_ingredient?: string | null
          category?: string | null
          created_at?: string
          default_withdrawal_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      lots: {
        Row: {
          created_at: string
          current_season: Database["public"]["Enums"]["season_type"] | null
          farm_id: string
          hectares: number | null
          id: string
          name: string
          phenological_week: number | null
          plant_count: number | null
          planting_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_season?: Database["public"]["Enums"]["season_type"] | null
          farm_id: string
          hectares?: number | null
          id?: string
          name: string
          phenological_week?: number | null
          plant_count?: number | null
          planting_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_season?: Database["public"]["Enums"]["season_type"] | null
          farm_id?: string
          hectares?: number | null
          id?: string
          name?: string
          phenological_week?: number | null
          plant_count?: number | null
          planting_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          farm_id: string | null
          full_name: string
          id: string
          identification: string | null
          is_active: boolean | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          farm_id?: string | null
          full_name: string
          id?: string
          identification?: string | null
          is_active?: boolean | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          farm_id?: string | null
          full_name?: string
          id?: string
          identification?: string | null
          is_active?: boolean | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_report_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          pest_report_id: string
          photo_url: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          pest_report_id: string
          photo_url: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          pest_report_id?: string
          photo_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pest_report_photos_pest_report_id_fkey"
            columns: ["pest_report_id"]
            isOneToOne: false
            referencedRelation: "pest_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_report_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["pest_report_status"]
          notes: string | null
          pest_report_id: string
          previous_status:
            | Database["public"]["Enums"]["pest_report_status"]
            | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["pest_report_status"]
          notes?: string | null
          pest_report_id: string
          previous_status?:
            | Database["public"]["Enums"]["pest_report_status"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["pest_report_status"]
          notes?: string | null
          pest_report_id?: string
          previous_status?:
            | Database["public"]["Enums"]["pest_report_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "pest_report_status_history_pest_report_id_fkey"
            columns: ["pest_report_id"]
            isOneToOne: false
            referencedRelation: "pest_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_reports: {
        Row: {
          created_at: string
          follow_up_date: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          incidence_percent: number | null
          is_resolved: boolean | null
          lot_id: string
          notes: string | null
          operator_id: string | null
          pest_type: string
          photo_url: string | null
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: number
          status: Database["public"]["Enums"]["pest_report_status"]
          treatment_started_at: string | null
        }
        Insert: {
          created_at?: string
          follow_up_date?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incidence_percent?: number | null
          is_resolved?: boolean | null
          lot_id: string
          notes?: string | null
          operator_id?: string | null
          pest_type: string
          photo_url?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: number
          status?: Database["public"]["Enums"]["pest_report_status"]
          treatment_started_at?: string | null
        }
        Update: {
          created_at?: string
          follow_up_date?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          incidence_percent?: number | null
          is_resolved?: boolean | null
          lot_id?: string
          notes?: string | null
          operator_id?: string | null
          pest_type?: string
          photo_url?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["pest_report_status"]
          treatment_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pest_reports_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pest_reports_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      protocol_components: {
        Row: {
          created_at: string
          dose_amount: number
          dose_base: string
          dose_unit: string
          id: string
          notes: string | null
          product_id: string
          protocol_version_id: string
          withdrawal_days: number
        }
        Insert: {
          created_at?: string
          dose_amount: number
          dose_base?: string
          dose_unit?: string
          id?: string
          notes?: string | null
          product_id: string
          protocol_version_id: string
          withdrawal_days?: number
        }
        Update: {
          created_at?: string
          dose_amount?: number
          dose_base?: string
          dose_unit?: string
          id?: string
          notes?: string | null
          product_id?: string
          protocol_version_id?: string
          withdrawal_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_components_protocol_version_id_fkey"
            columns: ["protocol_version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_steps: {
        Row: {
          created_at: string
          id: string
          instruction: string
          is_required: boolean | null
          protocol_version_id: string
          step_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          instruction: string
          is_required?: boolean | null
          protocol_version_id: string
          step_order: number
        }
        Update: {
          created_at?: string
          id?: string
          instruction?: string
          is_required?: boolean | null
          protocol_version_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_steps_protocol_version_id_fkey"
            columns: ["protocol_version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_versions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          protocol_id: string
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["protocol_status"]
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          protocol_id: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          version_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          protocol_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["protocol_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          category: Database["public"]["Enums"]["protocol_category"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["protocol_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["protocol_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_rules: {
        Row: {
          created_at: string
          created_by: string | null
          date_end: string | null
          date_start: string | null
          farm_id: string | null
          id: string
          is_active: boolean | null
          iso_week_end: number | null
          iso_week_start: number | null
          lot_id: string | null
          name: string
          pheno_week_end: number | null
          pheno_week_start: number | null
          priority: number
          protocol_version_id: string
          rule_type: Database["public"]["Enums"]["schedule_rule_type"]
          season: Database["public"]["Enums"]["season_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          iso_week_end?: number | null
          iso_week_start?: number | null
          lot_id?: string | null
          name: string
          pheno_week_end?: number | null
          pheno_week_start?: number | null
          priority?: number
          protocol_version_id: string
          rule_type: Database["public"]["Enums"]["schedule_rule_type"]
          season?: Database["public"]["Enums"]["season_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          iso_week_end?: number | null
          iso_week_start?: number | null
          lot_id?: string | null
          name?: string
          pheno_week_end?: number | null
          pheno_week_start?: number | null
          priority?: number
          protocol_version_id?: string
          rule_type?: Database["public"]["Enums"]["schedule_rule_type"]
          season?: Database["public"]["Enums"]["season_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_rules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_rules_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_rules_protocol_version_id_fkey"
            columns: ["protocol_version_id"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_harvest: { Args: { p_date: string; p_lot_id: string }; Returns: Json }
      get_suggested_mix: {
        Args: { p_date: string; p_lot_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_agronoma: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "agronoma" | "operario" | "consulta"
      application_status: "ejecutada" | "no_ejecutada" | "ejecutada_con_novedad"
      pest_report_status: "pendiente" | "en_tratamiento" | "resuelto"
      protocol_category:
        | "fenologia"
        | "epoca"
        | "sanitario"
        | "nutricion"
        | "otro"
      protocol_status: "draft" | "published" | "archived"
      schedule_rule_type:
        | "DATE_RANGE"
        | "ISO_WEEK"
        | "SEASON"
        | "PHENO_WEEK"
        | "DEFAULT"
      season_type: "lluvias" | "sequia" | "invierno" | "verano"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "agronoma", "operario", "consulta"],
      application_status: [
        "ejecutada",
        "no_ejecutada",
        "ejecutada_con_novedad",
      ],
      pest_report_status: ["pendiente", "en_tratamiento", "resuelto"],
      protocol_category: [
        "fenologia",
        "epoca",
        "sanitario",
        "nutricion",
        "otro",
      ],
      protocol_status: ["draft", "published", "archived"],
      schedule_rule_type: [
        "DATE_RANGE",
        "ISO_WEEK",
        "SEASON",
        "PHENO_WEEK",
        "DEFAULT",
      ],
      season_type: ["lluvias", "sequia", "invierno", "verano"],
    },
  },
} as const
