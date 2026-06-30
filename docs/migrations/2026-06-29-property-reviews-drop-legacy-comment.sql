-- Fix: Field 'comment' doesn't have a default value
-- The Spring API writes public_comment; legacy comment/review_body columns must be removed.
-- Safe to re-run after docs/migrations/2026-06-21-property-reviews-schema-fix.sql

-- Ensure public_comment exists (rename legacy comment if needed)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0,
    'ALTER TABLE property_reviews CHANGE COLUMN comment public_comment TEXT NULL',
    'ALTER TABLE property_reviews ADD COLUMN public_comment TEXT NULL'
  )
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Copy data then drop legacy comment
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'UPDATE property_reviews SET public_comment = COALESCE(NULLIF(public_comment, ''''), comment)',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0,
  'ALTER TABLE property_reviews DROP COLUMN comment',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
