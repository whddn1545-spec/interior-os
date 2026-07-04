-- 사장님 아침 브리핑 설정
-- Supabase SQL Editor에서 실행하세요

-- 브리핑 SMS 수신 번호 + 수신 여부
alter table tenants
  add column if not exists owner_phone text,
  add column if not exists briefing_enabled boolean not null default true;

comment on column tenants.owner_phone is '사장님 휴대폰 번호 — 아침 브리핑 SMS 수신용';
comment on column tenants.briefing_enabled is '아침 브리핑 SMS 수신 여부';

-- 브리핑은 고객/작업자가 아닌 사장님(owner)에게 발송되므로 target_type 확장
alter table message_logs drop constraint message_logs_target_type_check;
alter table message_logs
  add constraint message_logs_target_type_check
  check (target_type in ('customer','worker','owner'));
