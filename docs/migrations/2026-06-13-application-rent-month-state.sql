-- received = rent paid; unavailable = special case (no rent expected this month).
ALTER TABLE application_rent_month_records
  ADD COLUMN month_state VARCHAR(24) NOT NULL DEFAULT 'received' AFTER payment_channel;
