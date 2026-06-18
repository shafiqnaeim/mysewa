ALTER TABLE application_rent_month_student_logs
  ADD COLUMN payment_method VARCHAR(32) NULL AFTER logged_at,
  ADD COLUMN receipt_url VARCHAR(1024) NULL AFTER payment_method;
