-- ────────────────────────────────────────────
-- 현장 공정 체크리스트
-- ────────────────────────────────────────────
create table site_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  site_id       uuid not null references sites(id) on delete cascade,
  phase_key     text not null,
  done_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique(site_id, phase_key)
);

create index idx_site_checklist_site on site_checklist_items (site_id);

alter table site_checklist_items enable row level security;

create policy "tenant_isolation" on site_checklist_items
  using (tenant_id = (
    select tenant_id from profiles where id = auth.uid()
  ));
