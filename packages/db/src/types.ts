export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Row 타입 (DB에서 읽어오는 전체 컬럼) ──────────────────────────────
// NOTE: Must use `type` (not `interface`) so that Row extends Record<string, unknown>
// in supabase-js v2 conditional type checks (interface doesn't satisfy Record<string,unknown>)
export type TenantRow = {
  id: string; business_name: string; owner_name: string;
  plan: "basic" | "pro" | "team"; logo_url: string | null;
  default_settings: Json | null; created_at: string; updated_at: string;
};
export type UserRow = {
  id: string; tenant_id: string; role: "owner" | "staff";
  display_name: string; created_at: string; updated_at: string;
};
export type CustomerRow = {
  id: string; tenant_id: string; name: string; phone: string;
  address: string | null; memo: string | null;
  grade: "vip" | "gold" | "normal" | "dormant";
  source: "referral" | "online" | "repeat" | "etc";
  tags: string[] | null; imported_from: string | null;
  created_at: string; updated_at: string;
};
export type DistanceZoneRow = {
  id: string; tenant_id: string; name: string;
  distance_factor: number; created_at: string; updated_at: string;
};
export type SiteRow = {
  id: string; tenant_id: string; customer_id: string;
  name: string; address: string; distance_zone_id: string | null;
  area_pyeong: number | null; difficulty: "easy" | "normal" | "hard";
  main_door_code: string | null; unit_door_code: string | null;
  status: "lead" | "quoting" | "contracted" | "in_progress" | "done" | "canceled";
  start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
};
export type TradeRow = {
  id: string; tenant_id: string | null; code: string; name_ko: string;
  unit: "pyeong" | "m2" | "m" | "ea" | "set" | "day";
  sort_order: number; created_at: string; updated_at: string;
};
export type TradePriceRow = {
  id: string; tenant_id: string; trade_id: string; item_name: string;
  material_unit_price: number; labor_day_rate: number;
  default_days_per_unit: number; effective_from: string;
  is_active: boolean; created_at: string; updated_at: string;
};
export type QuoteRow = {
  id: string; tenant_id: string; site_id: string; version: number;
  status: "draft" | "confirmed" | "sent" | "accepted" | "rejected";
  subtotal: number; distance_factor: number; difficulty_factor: number;
  reserve_rate: number; contingency_rate: number; total_amount: number;
  customer_pdf_url: string | null; internal_pdf_url: string | null;
  confirmed_by: string | null; confirmed_at: string | null;
  created_at: string; updated_at: string;
};
export type QuoteItemRow = {
  id: string; tenant_id: string; quote_id: string; trade_id: string;
  description: string; quantity: number; unit: string;
  material_cost: number; labor_days: number; labor_cost: number;
  line_total: number; created_at: string; updated_at: string;
};
export type ContractRow = {
  id: string; tenant_id: string; quote_id: string; site_id: string;
  status: "draft" | "confirmed" | "signed";
  special_terms: string | null; payment_terms: Json | null;
  pdf_url: string | null; confirmed_by: string | null; confirmed_at: string | null;
  created_at: string; updated_at: string;
};
export type ScheduleTaskRow = {
  id: string; tenant_id: string; site_id: string; trade_id: string;
  title: string; start_date: string | null; end_date: string | null;
  duration_days: number; depends_on: string[] | null;
  kind: "work" | "reserve" | "contingency"; assignment_id: string | null;
  status: "planned" | "active" | "done" | "canceled";
  created_at: string; updated_at: string;
};
export type WorkerRow = {
  id: string; tenant_id: string; name: string; phone: string;
  company: string | null; rating: number | null; memo: string | null;
  is_active: boolean; created_at: string; updated_at: string;
};
export type WorkerTradeRow = {
  worker_id: string; trade_id: string; day_rate: number | null;
};
export type AssignmentRow = {
  id: string; tenant_id: string; site_id: string;
  worker_id: string; trade_id: string;
  start_date: string | null; end_date: string | null;
  status: "proposed" | "confirmed" | "declined" | "done";
  notified_at: string | null; created_at: string; updated_at: string;
};
export type FinanceEntryRow = {
  id: string; tenant_id: string; site_id: string | null;
  direction: "in" | "out";
  category: "customer_payment" | "material" | "labor" | "outsourcing" | "etc";
  counterparty: string | null; worker_id: string | null;
  amount: number; paid_at: string; memo: string | null;
  created_at: string; updated_at: string;
};
export type PhotoRow = {
  id: string; tenant_id: string; site_id: string;
  storage_path: string; taken_at: string | null; gps: Json | null;
  trade_id: string | null; phase: "before" | "progress" | "after" | null;
  quality_score: number | null; ai_tags: Json | null;
  status: "uploaded" | "auto_tagged" | "reviewed";
  created_at: string; updated_at: string;
};
export type MessageLogRow = {
  id: string; tenant_id: string;
  target_type: "customer" | "worker"; target_id: string;
  site_id: string | null; channel: "alimtalk" | "sms";
  template_code: string | null; body_masked: string;
  status: "queued" | "sent" | "failed";
  provider_msg_id: string | null; idempotency_key: string;
  sent_at: string | null; created_at: string; updated_at: string;
};
export type InstagramPostRow = {
  id: string; tenant_id: string; site_id: string | null;
  photo_id: string | null; photo_ids: string[];
  status: "draft" | "confirmed" | "published";
  caption: string | null; hashtags: string[] | null;
  published_at: string | null; ig_media_id: string | null;
  confirmed_by: string | null; confirmed_at: string | null;
  created_at: string; updated_at: string;
};
export type AiInvocationRow = {
  id: string; tenant_id: string | null; task: string; model: string;
  prompt_version: string | null; input_tokens: number | null;
  output_tokens: number | null; cost_usd: number | null;
  latency_ms: number | null; success: boolean;
  error_message: string | null; created_at: string;
};
export type AuditLogRow = {
  id: string; tenant_id: string; user_id: string;
  action: string; entity_type: string; entity_id: string;
  before_data: Json | null; after_data: Json | null; created_at: string;
};
export type PaymentRecordRow = {
  id: string; tenant_id: string; user_id: string;
  order_id: string; payment_key: string | null;
  plan_id: "pro" | "team"; amount: number;
  status: "pending" | "confirmed" | "failed";
  created_at: string; updated_at: string;
};

// Nullable 필드를 optional로 변환 (Supabase CLI 생성 타입과 동일한 패턴)
type NullableToOptional<T> =
  { [K in keyof T as (null extends T[K] ? never : K)]: T[K] } &
  { [K in keyof T as (null extends T[K] ? K : never)]?: T[K] };

type InsertBase<Row> = NullableToOptional<Omit<Row, "id" | "created_at" | "updated_at">> & { id?: string };

// supabase-js v2가 요구하는 Relationships 필드 포함 테이블 타입 헬퍼
type T<Row, Insert = InsertBase<Row>, Update = Partial<Insert>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: never[];
};

// ── Supabase Database 제네릭 타입 ────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      tenants:        T<TenantRow>;
      users:          T<UserRow>;
      customers:      T<CustomerRow>;
      distance_zones: T<DistanceZoneRow>;
      sites:          T<SiteRow>;
      trades:         T<TradeRow>;
      trade_prices:   T<TradePriceRow>;
      quotes:         T<QuoteRow>;
      quote_items:    T<QuoteItemRow>;
      contracts:      T<ContractRow>;
      schedule_tasks: T<ScheduleTaskRow>;
      workers:        T<WorkerRow>;
      worker_trades:  T<WorkerTradeRow>;
      assignments:    T<AssignmentRow>;
      finance_entries:T<FinanceEntryRow>;
      photos:         T<PhotoRow>;
      message_logs:   T<MessageLogRow>;
      instagram_posts:T<InstagramPostRow>;
      ai_invocations:   T<AiInvocationRow, InsertBase<AiInvocationRow>, never>;
      audit_logs:       T<AuditLogRow,     InsertBase<AuditLogRow>,     never>;
      payment_records:  T<PaymentRecordRow>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// 편의 타입
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Tenant = TenantRow;
export type User = UserRow;
export type Customer = CustomerRow;
export type Site = SiteRow;
export type Trade = TradeRow;
export type TradePrice = TradePriceRow;
export type Quote = QuoteRow;
export type QuoteItem = QuoteItemRow;
export type Contract = ContractRow;
export type ScheduleTask = ScheduleTaskRow;
export type Worker = WorkerRow;
export type Assignment = AssignmentRow;
export type FinanceEntry = FinanceEntryRow;
export type Photo = PhotoRow;
export type MessageLog = MessageLogRow;
export type DistanceZone = DistanceZoneRow;
export type InstagramPost = InstagramPostRow;
export type AiInvocation = AiInvocationRow;
export type AuditLog = AuditLogRow;
