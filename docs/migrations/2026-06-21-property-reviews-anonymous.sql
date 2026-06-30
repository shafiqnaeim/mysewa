-- Optional anonymous reviews flag
ALTER TABLE property_reviews
  ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0 AFTER photos;
