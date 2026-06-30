-- Add booking_id + is_anonymous to property_reviews (safe to re-run).
-- Run if review submit fails with "rollback-only" / unknown column errors.
-- Full multi-category upgrade: docs/migrations/2026-06-21-property-reviews-multicategory.sql

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'booking_id') > 0,
  'SELECT ''booking_id already exists'' AS note',
  'ALTER TABLE property_reviews ADD COLUMN booking_id INT NULL AFTER student_id'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'is_anonymous') > 0,
  'SELECT ''is_anonymous already exists'' AS note',
  'ALTER TABLE property_reviews ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
