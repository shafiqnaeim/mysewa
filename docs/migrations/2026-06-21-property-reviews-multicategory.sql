-- Multi-category property reviews (MySewa)
-- Run against an existing database that has property_reviews with rating + review_body.

ALTER TABLE property_reviews
  ADD COLUMN booking_id INT NULL AFTER student_id,
  ADD COLUMN rating_cleanliness INT NOT NULL DEFAULT 0,
  ADD COLUMN rating_condition INT NOT NULL DEFAULT 0,
  ADD COLUMN rating_amenities INT NOT NULL DEFAULT 0,
  ADD COLUMN rating_landlord INT NOT NULL DEFAULT 0,
  ADD COLUMN rating_location INT NOT NULL DEFAULT 0,
  ADD COLUMN rating_value INT NOT NULL DEFAULT 0;

ALTER TABLE property_reviews
  CHANGE COLUMN rating rating_overall INT NOT NULL DEFAULT 0;

-- Migrate legacy review_body → public_comment when present.
ALTER TABLE property_reviews
  CHANGE COLUMN review_body public_comment TEXT NULL;

ALTER TABLE property_reviews
  ADD COLUMN category_comments JSON NULL AFTER rating_value,
  ADD COLUMN photos JSON NULL AFTER public_comment;

-- Back-fill overall rating for rows created before category columns existed.
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
