-- ────────────────────────────────────────────
-- 통화 상담 노트 (Whisper + GPT-4o 자동 문서화)
-- ────────────────────────────────────────────
create table consultation_notes (
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

create index idx_consultation_notes_customer on consultation_notes (customer_id);
create index idx_consultation_notes_tenant   on consultation_notes (tenant_id, created_at desc);

-- RLS
alter table consultation_notes enable row level security;

create policy "tenant_isolation" on consultation_notes
  using (tenant_id = (
    select tenant_id from profiles where id = auth.uid()
  ));
