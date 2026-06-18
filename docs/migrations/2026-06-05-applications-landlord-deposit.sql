-- Deposit amount (MYR) chosen by landlord when accepting an application.
ALTER TABLE applications ADD COLUMN landlord_deposit_amount DECIMAL(12,2) NULL;
