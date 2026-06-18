export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          business_name: string;
          owner_name: string;
          plan: "basic" | "pro" | "team";
          logo_url: string | null;
          default_settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };

      users: {
        Row: {
          id: string;
          tenant_id: string;
          role: "owner" | "staff";
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };

      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string;
          address: string | null;
          memo: string | null;
          grade: "vip" | "gold" | "normal" | "dormant";
          source: "referral" | "online" | "repeat" | "etc";
          tags: string[] | null;
          imported_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };

      distance_zones: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          distance_factor: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["distance_zones"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["distance_zones"]["Insert"]>;
      };

      sites: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string;
          name: string;
          address: string;
          distance_zone_id: string | null;
          area_pyeong: number | null;
          difficulty: "easy" | "normal" | "hard";
          main_door_code: string | null;
          unit_door_code: string | null;
          status: "lead" | "quoting" | "contracted" | "in_progress" | "done" | "canceled";
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sites"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["sites"]["Insert"]>;
      };

      trades: {
        Row: {
          id: string;
          tenant_id: string | null;
          code: string;
          name_ko: string;
          unit: "pyeong" | "m2" | "m" | "ea" | "set" | "day";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trades"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
      };

      trade_prices: {
        Row: {
          id: string;
          tenant_id: string;
          trade_id: string;
          item_name: string;
          material_unit_price: number;
          labor_day_rate: number;
          default_days_per_unit: number;
          effective_from: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trade_prices"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["trade_prices"]["Insert"]>;
      };

      quotes: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string;
          version: number;
          status: "draft" | "confirmed" | "sent" | "accepted" | "rejected";
          subtotal: number;
          distance_factor: number;
          difficulty_factor: number;
          reserve_rate: number;
          contingency_rate: number;
          total_amount: number;
          customer_pdf_url: string | null;
          internal_pdf_url: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quotes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
      };

      quote_items: {
        Row: {
          id: string;
          tenant_id: string;
          quote_id: string;
          trade_id: string;
          description: string;
          quantity: number;
          unit: string;
          material_cost: number;
          labor_days: number;
          labor_cost: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["quote_items"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["quote_items"]["Insert"]>;
      };

      contracts: {
        Row: {
          id: string;
          tenant_id: string;
          quote_id: string;
          site_id: string;
          status: "draft" | "confirmed" | "signed";
          special_terms: string | null;
          payment_terms: Json | null;
          pdf_url: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["contracts"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Insert"]>;
      };

      schedule_tasks: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string;
          trade_id: string;
          title: string;
          start_date: string | null;
          end_date: string | null;
          duration_days: number;
          depends_on: string[] | null;
          kind: "work" | "reserve" | "contingency";
          assignment_id: string | null;
          status: "planned" | "active" | "done" | "canceled";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["schedule_tasks"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["schedule_tasks"]["Insert"]>;
      };

      workers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string;
          company: string | null;
          rating: number | null;
          memo: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workers"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["workers"]["Insert"]>;
      };

      worker_trades: {
        Row: {
          worker_id: string;
          trade_id: string;
          day_rate: number | null;
        };
        Insert: Database["public"]["Tables"]["worker_trades"]["Row"];
        Update: Partial<Database["public"]["Tables"]["worker_trades"]["Insert"]>;
      };

      assignments: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string;
          worker_id: string;
          trade_id: string;
          start_date: string | null;
          end_date: string | null;
          status: "proposed" | "confirmed" | "declined" | "done";
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assignments"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
      };

      finance_entries: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string;
          direction: "in" | "out";
          category: "customer_payment" | "material" | "labor" | "outsourcing" | "etc";
          counterparty: string | null;
          worker_id: string | null;
          amount: number;
          paid_at: string;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["finance_entries"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["finance_entries"]["Insert"]>;
      };

      photos: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string;
          storage_path: string;
          taken_at: string | null;
          gps: Json | null;
          trade_id: string | null;
          phase: "before" | "progress" | "after" | null;
          quality_score: number | null;
          ai_tags: Json | null;
          status: "uploaded" | "auto_tagged" | "reviewed";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["photos"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
      };

      message_logs: {
        Row: {
          id: string;
          tenant_id: string;
          target_type: "customer" | "worker";
          target_id: string;
          site_id: string | null;
          channel: "alimtalk" | "sms";
          template_code: string | null;
          body_masked: string;
          status: "queued" | "sent" | "failed";
          provider_msg_id: string | null;
          idempotency_key: string;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["message_logs"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["message_logs"]["Insert"]>;
      };

      instagram_posts: {
        Row: {
          id: string;
          tenant_id: string;
          site_id: string | null;
          status: "draft" | "confirmed" | "published";
          caption: string | null;
          photo_ids: string[];
          published_at: string | null;
          ig_media_id: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["instagram_posts"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["instagram_posts"]["Insert"]>;
      };

      ai_invocations: {
        Row: {
          id: string;
          tenant_id: string | null;
          task: string;
          model: string;
          prompt_version: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          cost_usd: number | null;
          latency_ms: number | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_invocations"]["Row"], "id" | "created_at"> & { id?: string };
        Update: never;
      };

      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at"> & { id?: string };
        Update: never;
      };
    };
  };
}

// 편의 타입
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Tenant = Tables<"tenants">;
export type User = Tables<"users">;
export type Customer = Tables<"customers">;
export type Site = Tables<"sites">;
export type Trade = Tables<"trades">;
export type TradePrice = Tables<"trade_prices">;
export type Quote = Tables<"quotes">;
export type QuoteItem = Tables<"quote_items">;
export type Contract = Tables<"contracts">;
export type ScheduleTask = Tables<"schedule_tasks">;
export type Worker = Tables<"workers">;
export type Assignment = Tables<"assignments">;
export type FinanceEntry = Tables<"finance_entries">;
export type Photo = Tables<"photos">;
export type MessageLog = Tables<"message_logs">;
export type DistanceZone = Tables<"distance_zones">;
export type InstagramPost = Tables<"instagram_posts">;
export type AiInvocation = Tables<"ai_invocations">;
export type AuditLog = Tables<"audit_logs">;
