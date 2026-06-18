-- InteriorOS 초기 스키마
-- Supabase SQL Editor에서 실행하세요

-- ────────────────────────────────────────────
-- 0. 공통 헬퍼
-- ────────────────────────────────────────────

-- JWT에서 tenant_id를 추출하는 함수 (RLS 정책에서 사용)
create or replace function current_tenant()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

-- updated_at 자동 갱신 트리거 함수
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────
-- 1. tenants
-- ────────────────────────────────────────────
create table tenants (
  id              uuid primary key default gen_random_uuid(),
  business_name   text not null,
  owner_name      text not null,
  plan            text not null default 'basic' check (plan in ('basic','pro','team')),
  logo_url        text,
  default_settings jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger tenants_updated_at before update on tenants
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 2. users (auth.users 1:1 extension)
-- ────────────────────────────────────────────
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner','staff')),
  display_name text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_users_tenant on users (tenant_id);
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 3. distance_zones
-- ────────────────────────────────────────────
create table distance_zones (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  distance_factor numeric(5,2) not null default 1.00,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_distance_zones_tenant on distance_zones (tenant_id);
create trigger distance_zones_updated_at before update on distance_zones
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 4. customers
-- ────────────────────────────────────────────
create table customers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  phone         text not null,
  address       text,
  memo          text,
  grade         text not null default 'normal' check (grade in ('vip','gold','normal','dormant')),
  source        text not null default 'etc' check (source in ('referral','online','repeat','etc')),
  tags          text[],
  imported_from text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_customers_tenant on customers (tenant_id);
create index idx_customers_tenant_phone on customers (tenant_id, phone);
create trigger customers_updated_at before update on customers
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 5. sites (현장/프로젝트)
-- ────────────────────────────────────────────
create table sites (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  customer_id        uuid not null references customers(id),
  name               text not null,
  address            text not null,
  distance_zone_id   uuid references distance_zones(id),
  area_pyeong        numeric(8,2),
  difficulty         text not null default 'normal' check (difficulty in ('easy','normal','hard')),
  main_door_code     text,
  unit_door_code     text,
  status             text not null default 'lead'
                     check (status in ('lead','quoting','contracted','in_progress','done','canceled')),
  start_date         date,
  end_date           date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_sites_tenant on sites (tenant_id);
create index idx_sites_tenant_status on sites (tenant_id, status);
create index idx_sites_tenant_customer on sites (tenant_id, customer_id);
create trigger sites_updated_at before update on sites
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 6. trades (공종 마스터)
-- ────────────────────────────────────────────
create table trades (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade, -- null = 시스템 기본
  code      text not null,
  name_ko   text not null,
  unit      text not null check (unit in ('pyeong','m2','m','ea','set','day')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index idx_trades_tenant on trades (tenant_id);
create trigger trades_updated_at before update on trades
  for each row execute function set_updated_at();

-- 기본 공종 데이터
insert into trades (tenant_id, code, name_ko, unit, sort_order) values
  (null, 'flooring',   '바닥재',   'pyeong', 10),
  (null, 'wallpaper',  '도배',     'pyeong', 20),
  (null, 'tile',       '타일',     'm2',     30),
  (null, 'paint',      '도장',     'm2',     40),
  (null, 'carpentry',  '목공',     'set',    50),
  (null, 'window',     '창호',     'ea',     60),
  (null, 'electric',   '전기',     'set',    70),
  (null, 'plumbing',   '배관/설비', 'set',   80),
  (null, 'demolition', '철거',     'pyeong', 90),
  (null, 'cleanup',    '청소',     'pyeong', 100);

-- ────────────────────────────────────────────
-- 7. trade_prices (단가표)
-- ────────────────────────────────────────────
create table trade_prices (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  trade_id              uuid not null references trades(id),
  item_name             text not null,
  material_unit_price   numeric(12,0) not null default 0,
  labor_day_rate        numeric(12,0) not null default 0,
  default_days_per_unit numeric(5,2) not null default 1,
  effective_from        date not null default current_date,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_trade_prices_tenant_trade on trade_prices (tenant_id, trade_id);
create trigger trade_prices_updated_at before update on trade_prices
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 8. quotes (견적)
-- ────────────────────────────────────────────
create table quotes (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  site_id           uuid not null references sites(id),
  version           int not null default 1,
  status            text not null default 'draft'
                    check (status in ('draft','confirmed','sent','accepted','rejected')),
  subtotal          numeric(14,0) not null default 0,
  distance_factor   numeric(5,2) not null default 1.00,
  difficulty_factor numeric(5,2) not null default 1.00,
  reserve_rate      numeric(5,2) not null default 0.20,
  contingency_rate  numeric(5,2) not null default 0.10,
  total_amount      numeric(14,0) not null default 0,
  customer_pdf_url  text,
  internal_pdf_url  text,
  confirmed_by      uuid references users(id),
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_quotes_tenant_site on quotes (tenant_id, site_id);
create index idx_quotes_tenant_status on quotes (tenant_id, status);
create trigger quotes_updated_at before update on quotes
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 9. quote_items (견적 항목)
-- ────────────────────────────────────────────
create table quote_items (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  quote_id       uuid not null references quotes(id) on delete cascade,
  trade_id       uuid not null references trades(id),
  description    text not null,
  quantity       numeric(10,2) not null,
  unit           text not null,
  material_cost  numeric(14,0) not null default 0,
  labor_days     numeric(5,2) not null default 0,
  labor_cost     numeric(14,0) not null default 0,
  line_total     numeric(14,0) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_quote_items_tenant_quote on quote_items (tenant_id, quote_id);
create trigger quote_items_updated_at before update on quote_items
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 10. contracts (계약서)
-- ────────────────────────────────────────────
create table contracts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  quote_id      uuid not null references quotes(id),
  site_id       uuid not null references sites(id),
  status        text not null default 'draft' check (status in ('draft','confirmed','signed')),
  special_terms text,
  payment_terms jsonb,
  pdf_url       text,
  confirmed_by  uuid references users(id),
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_contracts_tenant_site on contracts (tenant_id, site_id);
create trigger contracts_updated_at before update on contracts
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 11. workers (작업자/업체)
-- ────────────────────────────────────────────
create table workers (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name      text not null,
  phone     text not null,
  company   text,
  rating    numeric(2,1) check (rating >= 0 and rating <= 5),
  memo      text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_workers_tenant on workers (tenant_id);
create trigger workers_updated_at before update on workers
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 12. worker_trades (작업자 ↔ 공종 다대다)
-- ────────────────────────────────────────────
create table worker_trades (
  worker_id uuid not null references workers(id) on delete cascade,
  trade_id  uuid not null references trades(id) on delete cascade,
  day_rate  numeric(12,0),
  primary key (worker_id, trade_id)
);

-- ────────────────────────────────────────────
-- 13. assignments (현장 배정)
-- ────────────────────────────────────────────
create table assignments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  site_id     uuid not null references sites(id),
  worker_id   uuid not null references workers(id),
  trade_id    uuid not null references trades(id),
  start_date  date,
  end_date    date,
  status      text not null default 'proposed'
              check (status in ('proposed','confirmed','declined','done')),
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_assignments_tenant_site on assignments (tenant_id, site_id);
create index idx_assignments_tenant_worker on assignments (tenant_id, worker_id);
create trigger assignments_updated_at before update on assignments
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 14. schedule_tasks (공사 일정)
-- ────────────────────────────────────────────
create table schedule_tasks (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  site_id       uuid not null references sites(id),
  trade_id      uuid not null references trades(id),
  title         text not null,
  start_date    date,
  end_date      date,
  duration_days numeric(5,1) not null default 1,
  depends_on    uuid[],
  kind          text not null default 'work' check (kind in ('work','reserve','contingency')),
  assignment_id uuid references assignments(id),
  status        text not null default 'planned'
                check (status in ('planned','active','done','canceled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_schedule_tasks_tenant_site on schedule_tasks (tenant_id, site_id);
create trigger schedule_tasks_updated_at before update on schedule_tasks
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 15. finance_entries (재무 입출금)
-- ────────────────────────────────────────────
create table finance_entries (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  site_id      uuid not null references sites(id),
  direction    text not null check (direction in ('in','out')),
  category     text not null check (category in ('customer_payment','material','labor','outsourcing','etc')),
  counterparty text,
  worker_id    uuid references workers(id),
  amount       numeric(14,0) not null,
  paid_at      date not null,
  memo         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_finance_entries_tenant on finance_entries (tenant_id);
create index idx_finance_entries_tenant_site on finance_entries (tenant_id, site_id);
create index idx_finance_entries_tenant_paid on finance_entries (tenant_id, paid_at);
create trigger finance_entries_updated_at before update on finance_entries
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 16. photos (현장 사진)
-- ────────────────────────────────────────────
create table photos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  site_id       uuid not null references sites(id),
  storage_path  text not null,
  taken_at      timestamptz,
  gps           jsonb,
  trade_id      uuid references trades(id),
  phase         text check (phase in ('before','progress','after')),
  quality_score numeric(4,2),
  ai_tags       jsonb,
  status        text not null default 'uploaded'
                check (status in ('uploaded','auto_tagged','reviewed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_photos_tenant_site_taken on photos (tenant_id, site_id, taken_at);
create trigger photos_updated_at before update on photos
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 17. message_logs (문자/알림 발송 로그)
-- ────────────────────────────────────────────
create table message_logs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  target_type      text not null check (target_type in ('customer','worker')),
  target_id        uuid not null,
  site_id          uuid references sites(id),
  channel          text not null check (channel in ('alimtalk','sms')),
  template_code    text,
  body_masked      text not null,
  status           text not null default 'queued' check (status in ('queued','sent','failed')),
  provider_msg_id  text,
  idempotency_key  text not null unique,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_message_logs_tenant on message_logs (tenant_id);
create index idx_message_logs_tenant_target on message_logs (tenant_id, target_id);
create trigger message_logs_updated_at before update on message_logs
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 18. instagram_posts
-- ────────────────────────────────────────────
create table instagram_posts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  site_id      uuid references sites(id),
  status       text not null default 'draft' check (status in ('draft','confirmed','published')),
  caption      text,
  photo_ids    uuid[] not null default '{}',
  published_at timestamptz,
  ig_media_id  text,
  confirmed_by uuid references users(id),
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_instagram_posts_tenant on instagram_posts (tenant_id);
create trigger instagram_posts_updated_at before update on instagram_posts
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────
-- 19. ai_invocations (LLM 호출 로그)
-- ────────────────────────────────────────────
create table ai_invocations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid references tenants(id) on delete set null,
  task           text not null,
  model          text not null,
  prompt_version text,
  input_tokens   int,
  output_tokens  int,
  cost_usd       numeric(8,6),
  latency_ms     int,
  success        boolean not null default true,
  error_message  text,
  created_at     timestamptz not null default now()
);
create index idx_ai_invocations_tenant on ai_invocations (tenant_id);

-- ────────────────────────────────────────────
-- 20. audit_logs (감사 추적)
-- ────────────────────────────────────────────
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references users(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid not null,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_logs_tenant on audit_logs (tenant_id);
create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);
