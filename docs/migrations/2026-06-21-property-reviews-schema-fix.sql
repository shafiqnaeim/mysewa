-- Idempotent property_reviews schema upgrade for MySewa multi-category reviews.
-- Safe to re-run. Applies booking_id, is_anonymous, category ratings, public_comment, photos.
-- Usage: mysql -h HOST -P PORT -u USER -p DB_NAME < docs/migrations/2026-06-21-property-reviews-schema-fix.sql

-- booking_id
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'booking_id') > 0,
  'SELECT 1',
  'ALTER TABLE property_reviews ADD COLUMN booking_id INT NULL AFTER student_id'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rating_overall (rename legacy rating column when present)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'rating_overall') > 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'rating') > 0,
    'ALTER TABLE property_reviews CHANGE COLUMN rating rating_overall INT NOT NULL DEFAULT 0',
    'ALTER TABLE property_reviews ADD COLUMN rating_overall INT NOT NULL DEFAULT 0'
  )
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- public_comment (rename legacy comment / review_body when present)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'SELECT 1',
  IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0,
    'ALTER TABLE property_reviews CHANGE COLUMN comment public_comment TEXT NULL',
    IF(
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'review_body') > 0,
      'ALTER TABLE property_reviews CHANGE COLUMN review_body public_comment TEXT NULL',
      'ALTER TABLE property_reviews ADD COLUMN public_comment TEXT NULL'
    )
  )
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Copy legacy comment → public_comment when both columns exist
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'UPDATE property_reviews SET public_comment = COALESCE(NULLIF(public_comment, ''''), comment)',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop orphan legacy comment column (Hibernate writes public_comment only)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'comment') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'ALTER TABLE property_reviews DROP COLUMN comment',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop orphan legacy review_body column
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'review_body') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'public_comment') > 0,
  'ALTER TABLE property_reviews DROP COLUMN review_body',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop orphan legacy rating column (Hibernate writes rating_overall only)
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'rating') > 0
  AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'rating_overall') > 0,
  'ALTER TABLE property_reviews DROP COLUMN rating',
  'SELECT 1'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Category rating columns
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'rating_cleanliness') > 0,
  'SELECT 1',
  'ALTER TABLE property_reviews
     ADD COLUMN rating_cleanliness INT NOT NULL DEFAULT 0,
     ADD COLUMN rating_condition INT NOT NULL DEFAULT 0,
     ADD COLUMN rating_amenities INT NOT NULL DEFAULT 0,
     ADD COLUMN rating_landlord INT NOT NULL DEFAULT 0,
     ADD COLUMN rating_location INT NOT NULL DEFAULT 0,
     ADD COLUMN rating_value INT NOT NULL DEFAULT 0'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- category_comments
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'category_comments') > 0,
  'SELECT 1',
  'ALTER TABLE property_reviews ADD COLUMN category_comments JSON NULL'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- photos
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'photos') > 0,
  'SELECT 1',
  'ALTER TABLE property_reviews ADD COLUMN photos JSON NULL'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- is_anonymous
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_reviews' AND COLUMN_NAME = 'is_anonymous') > 0,
  'SELECT 1',
  'ALTER TABLE property_reviews ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Back-fill category ratings from overall when empty
UPDATE property_reviews
SET
  rating_cleanliness = rating_overall,
  rating_condition = rating_overall,
  rating_amenities = rating_overall,
  rating_landlord = rating_overall,
  rating_location = rating_overall,
  rating_value = rating_overall
WHERE rating_overall > 0
  AND rating_cleanliness = 0
  AND rating_condition = 0
  AND rating_amenities = 0
  AND rating_landlord = 0
  AND rating_location = 0
  AND rating_value = 0;
