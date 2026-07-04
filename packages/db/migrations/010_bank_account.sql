-- 입금 계좌 저장 — 독촉 문자에 자동 포함용
-- Supabase SQL Editor에서 실행하세요

alter table tenants
  add column if not exists bank_account text;

comment on column tenants.bank_account is '입금 계좌 (예: 국민 123-45-678900 홍길동) — 독촉 문자에 자동 포함';
