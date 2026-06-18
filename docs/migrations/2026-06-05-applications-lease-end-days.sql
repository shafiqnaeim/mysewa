-- Add persisted lease end date and day span (matches Application entity / apply UI).
-- Safe to run once on existing databases; skip if columns already exist.

ALTER TABLE applications ADD COLUMN lease_end VARCHAR(32) NULL;
ALTER TABLE applications ADD COLUMN lease_days INT NULL;
