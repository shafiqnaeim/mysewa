-- Remove screening / cover-letter columns from applications (matches Java entity).
-- Run once on existing databases. If a column was already dropped, remove that line or run statements one-by-one.
-- Student move-out stays in column: lease_end (ISO yyyy-MM-dd).

ALTER TABLE applications DROP COLUMN message;
ALTER TABLE applications DROP COLUMN occupant_count;
ALTER TABLE applications DROP COLUMN study_work_summary;
ALTER TABLE applications DROP COLUMN emergency_contact_phone;
