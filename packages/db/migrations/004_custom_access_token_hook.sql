-- custom access token hook: JWT에 tenant_id claim 주입
-- Supabase Dashboard → Authentication → Hooks → Custom Access Token에서
-- function: auth.custom_access_token_hook 으로 활성화 필요

create or replace function auth.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  claims jsonb;
  user_tenant_id uuid;
begin
  select tenant_id into user_tenant_id
    from public.users
   where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- supabase_auth_admin 에 hook 실행 권한 부여
grant execute on function auth.custom_access_token_hook to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;

-- 결제 멱등성 기록 테이블
create table if not exists payment_records (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  order_id      text not null unique,
  payment_key   text unique,
  plan_id       text not null check (plan_id in ('pro', 'team')),
  amount        int  not null,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger payment_records_updated_at before update on payment_records
  for each row execute function set_updated_at();

alter table payment_records enable row level security;
create policy "payment_records_tenant" on payment_records for select
  using (tenant_id = current_tenant());
