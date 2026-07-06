-- ═══════════════════════════════════════════════════════════════
-- 미적용 마이그레이션 통합본 (004 ~ 010)
-- Supabase SQL Editor에 통째로 붙여넣고 Run 한 번이면 끝.
-- 전부 멱등(idempotent) — 이미 적용된 부분이 있어도 안전하게 재실행 가능.
--
-- 주의: 원본 006/007/008은 존재하지 않는 profiles 테이블을 참조해
-- 실행이 중단됐음. 여기서는 002와 동일한 current_tenant() 기준으로 수정.
-- ═══════════════════════════════════════════════════════════════

-- ── 004. 결제 스케줄 (계약금/중도금/잔금) ──────────────────────
create table if not exists payment_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  site_id uuid not null,
  quote_id uuid,
  stage text not null check (stage in ('deposit','midterm','balance')),
  stage_label text not null,
  amount numeric not null,
  due_date date,
  paid_at timestamptz,
  paid_amount numeric default 0,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table payment_schedules enable row level security;
drop policy if exists "tenant_payment_schedules" on payment_schedules;
create policy "tenant_payment_schedules" on payment_schedules
  using (tenant_id = current_tenant());
create index if not exists idx_payment_schedules_tenant on payment_schedules(tenant_id, site_id);

-- ── 005. 출역 장부 ─────────────────────────────────────────────
create table if not exists worker_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  worker_id uuid not null,
  site_id uuid not null,
  work_date date not null,
  day_rate numeric not null,
  note text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique(worker_id, site_id, work_date)
);
alter table worker_attendance enable row level security;
drop policy if exists "tenant_attendance" on worker_attendance;
create policy "tenant_attendance" on worker_attendance
  using (tenant_id = current_tenant());
create index if not exists idx_attendance_worker on worker_attendance(tenant_id, worker_id, work_date);

-- ── 006. 통화 상담 노트 ────────────────────────────────────────
create table if not exists consultation_notes (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  customer_id             uuid not null references customers(id) on delete cascade,
  created_at              timestamptz not null default now(),
  raw_transcript          text not null,
  summary                 text not null,
  requirements            text[] not null default '{}',
  action_items            text[] not null default '{}',
  quote_hints             jsonb not null default '{}',
  audio_duration_seconds  integer
);
create index if not exists idx_consultation_notes_customer on consultation_notes (customer_id);
create index if not exists idx_consultation_notes_tenant   on consultation_notes (tenant_id, created_at desc);
alter table consultation_notes enable row level security;
drop policy if exists "tenant_isolation" on consultation_notes;
create policy "tenant_isolation" on consultation_notes
  using (tenant_id = current_tenant());

-- ── 007. A/S 보증 요청 ─────────────────────────────────────────
create table if not exists as_requests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  site_id       uuid not null references sites(id) on delete cascade,
  title         text not null,
  description   text,
  status        text not null default 'open'
                check (status in ('open', 'in_progress', 'closed')),
  warranty_type text not null default 'repair'
                check (warranty_type in ('repair', 'inspection', 'complaint')),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_as_requests_site   on as_requests (site_id, status);
create index if not exists idx_as_requests_tenant on as_requests (tenant_id, status, created_at desc);
drop trigger if exists as_requests_updated_at on as_requests;
create trigger as_requests_updated_at before update on as_requests
  for each row execute function set_updated_at();
alter table as_requests enable row level security;
drop policy if exists "tenant_isolation" on as_requests;
create policy "tenant_isolation" on as_requests
  using (tenant_id = current_tenant());

-- ── 008. 현장 공정 체크리스트 ──────────────────────────────────
create table if not exists site_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  site_id       uuid not null references sites(id) on delete cascade,
  phase_key     text not null,
  done_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique(site_id, phase_key)
);
create index if not exists idx_site_checklist_site on site_checklist_items (site_id);
alter table site_checklist_items enable row level security;
drop policy if exists "tenant_isolation" on site_checklist_items;
create policy "tenant_isolation" on site_checklist_items
  using (tenant_id = current_tenant());

-- ── 009. 사장님 아침 브리핑 설정 ───────────────────────────────
alter table tenants
  add column if not exists owner_phone text,
  add column if not exists briefing_enabled boolean not null default true;
comment on column tenants.owner_phone is '사장님 휴대폰 번호 — 아침 브리핑 SMS 수신용';
comment on column tenants.briefing_enabled is '아침 브리핑 SMS 수신 여부';

alter table message_logs drop constraint if exists message_logs_target_type_check;
alter table message_logs
  add constraint message_logs_target_type_check
  check (target_type in ('customer','worker','owner'));

-- ── 010. 입금 계좌 ─────────────────────────────────────────────
alter table tenants
  add column if not exists bank_account text;
comment on column tenants.bank_account is '입금 계좌 (예: 국민 123-45-678900 홍길동) — 독촉 문자에 자동 포함';
