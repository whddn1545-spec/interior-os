-- ────────────────────────────────────────────
-- A/S 보증 요청 (사후 관리)
-- ────────────────────────────────────────────
create table as_requests (
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

create index idx_as_requests_site   on as_requests (site_id, status);
create index idx_as_requests_tenant on as_requests (tenant_id, status, created_at desc);

create trigger as_requests_updated_at before update on as_requests
  for each row execute function set_updated_at();

alter table as_requests enable row level security;

create policy "tenant_isolation" on as_requests
  using (tenant_id = (
    select tenant_id from profiles where id = auth.uid()
  ));
