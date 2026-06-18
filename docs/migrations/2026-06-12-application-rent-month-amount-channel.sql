-- Optional amount + channel for landlord monthly rent records (prototype).
ALTER TABLE application_rent_month_records ADD COLUMN amount DECIMAL(12,2) NULL AFTER rent_month;
ALTER TABLE application_rent_month_records ADD COLUMN payment_channel VARCHAR(64) NULL AFTER amount;
