-- Per-day property availability (locked when deposit confirms a booking)
CREATE TABLE IF NOT EXISTS property_availability_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  availability_date DATE NOT NULL,
  application_id INT NOT NULL,
  day_state VARCHAR(20) NOT NULL DEFAULT 'occupied',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_property_availability_day (property_id, availability_date),
  INDEX idx_avail_application (application_id),
  INDEX idx_avail_property_date (property_id, availability_date),
  CONSTRAINT fk_avail_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_avail_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
