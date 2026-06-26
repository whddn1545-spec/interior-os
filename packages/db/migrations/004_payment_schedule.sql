-- 결제 스케줄 (계약금/중도금/잔금 단계별 추적)
CREATE TABLE IF NOT EXISTS payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  site_id uuid NOT NULL,
  quote_id uuid,
  stage text NOT NULL CHECK (stage IN ('deposit','midterm','balance')),
  stage_label text NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  paid_at timestamptz,
  paid_amount numeric DEFAULT 0,
  memo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_payment_schedules" ON payment_schedules
  USING (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_payment_schedules_tenant ON payment_schedules(tenant_id, site_id);
