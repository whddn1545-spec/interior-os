-- InteriorOS RLS 정책
-- 001_initial_schema.sql 실행 후 이 파일을 실행하세요

-- ────────────────────────────────────────────
-- RLS 활성화 + 정책 (모든 업무 테이블)
-- 공통 원칙: tenant_id = current_tenant()
-- ────────────────────────────────────────────

-- tenants: 본인 테넌트만 조회 가능
alter table tenants enable row level security;
create policy "tenants_select" on tenants for select
  using (id = current_tenant());
create policy "tenants_update" on tenants for update
  using (id = current_tenant());

-- users
alter table users enable row level security;
create policy "users_all" on users for all
  using (tenant_id = current_tenant());

-- distance_zones
alter table distance_zones enable row level security;
create policy "distance_zones_all" on distance_zones for all
  using (tenant_id = current_tenant());

-- customers
alter table customers enable row level security;
create policy "customers_all" on customers for all
  using (tenant_id = current_tenant());

-- sites
alter table sites enable row level security;
create policy "sites_all" on sites for all
  using (tenant_id = current_tenant());

-- trades: 시스템 공종(tenant_id = null) + 본인 공종 모두 읽기, 쓰기는 본인 것만
alter table trades enable row level security;
create policy "trades_select" on trades for select
  using (tenant_id is null or tenant_id = current_tenant());
create policy "trades_insert" on trades for insert
  with check (tenant_id = current_tenant());
create policy "trades_update" on trades for update
  using (tenant_id = current_tenant());
create policy "trades_delete" on trades for delete
  using (tenant_id = current_tenant());

-- trade_prices
alter table trade_prices enable row level security;
create policy "trade_prices_all" on trade_prices for all
  using (tenant_id = current_tenant());

-- quotes
alter table quotes enable row level security;
create policy "quotes_all" on quotes for all
  using (tenant_id = current_tenant());

-- quote_items
alter table quote_items enable row level security;
create policy "quote_items_all" on quote_items for all
  using (tenant_id = current_tenant());

-- contracts
alter table contracts enable row level security;
create policy "contracts_all" on contracts for all
  using (tenant_id = current_tenant());

-- workers
alter table workers enable row level security;
create policy "workers_all" on workers for all
  using (tenant_id = current_tenant());

-- worker_trades: workers를 통해 tenant 확인
alter table worker_trades enable row level security;
create policy "worker_trades_all" on worker_trades for all
  using (
    exists (
      select 1 from workers w
      where w.id = worker_trades.worker_id
        and w.tenant_id = current_tenant()
    )
  );

-- assignments
alter table assignments enable row level security;
create policy "assignments_all" on assignments for all
  using (tenant_id = current_tenant());

-- schedule_tasks
alter table schedule_tasks enable row level security;
create policy "schedule_tasks_all" on schedule_tasks for all
  using (tenant_id = current_tenant());

-- finance_entries
alter table finance_entries enable row level security;
create policy "finance_entries_all" on finance_entries for all
  using (tenant_id = current_tenant());

-- photos
alter table photos enable row level security;
create policy "photos_all" on photos for all
  using (tenant_id = current_tenant());

-- message_logs
alter table message_logs enable row level security;
create policy "message_logs_all" on message_logs for all
  using (tenant_id = current_tenant());

-- instagram_posts
alter table instagram_posts enable row level security;
create policy "instagram_posts_all" on instagram_posts for all
  using (tenant_id = current_tenant());

-- ai_invocations: insert는 서버 역할(service_role)만, select는 테넌트 본인
alter table ai_invocations enable row level security;
create policy "ai_invocations_select" on ai_invocations for select
  using (tenant_id = current_tenant());
-- INSERT는 service_role 키로만 (API Route에서)

-- audit_logs: 읽기만 허용 (쓰기는 service_role)
alter table audit_logs enable row level security;
create policy "audit_logs_select" on audit_logs for select
  using (tenant_id = current_tenant());

-- ────────────────────────────────────────────
-- Storage 버킷 (Supabase Dashboard에서 직접 생성하거나 아래 SQL 실행)
-- ────────────────────────────────────────────

-- 사진 버킷
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict do nothing;

-- PDF 버킷
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict do nothing;

-- Storage RLS: 경로 prefix가 tenant_id/... 인 경우만 허용
create policy "photos_tenant_access" on storage.objects for all
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = current_tenant()::text
  );

create policy "pdfs_tenant_access" on storage.objects for all
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = current_tenant()::text
  );
