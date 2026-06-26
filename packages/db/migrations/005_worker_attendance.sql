CREATE TABLE IF NOT EXISTS worker_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  site_id uuid NOT NULL,
  work_date date NOT NULL,
  day_rate numeric NOT NULL,
  note text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, site_id, work_date)
);
ALTER TABLE worker_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_attendance" ON worker_attendance
  USING (tenant_id = (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON worker_attendance(tenant_id, worker_id, work_date);
