-- Workflow: pending → landlord received → student resolved

ALTER TABLE property_tenant_reports
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER image_url,
  ADD COLUMN received_at DATETIME NULL AFTER status,
  ADD COLUMN resolved_at DATETIME NULL AFTER received_at;
