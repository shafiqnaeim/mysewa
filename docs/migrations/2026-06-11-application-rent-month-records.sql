-- Landlord monthly rent tracking per accepted application (prototype).
CREATE TABLE IF NOT EXISTS application_rent_month_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  rent_year INT NOT NULL,
  rent_month INT NOT NULL COMMENT '1-12',
  recorded_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rent_month_app_ym (application_id, rent_year, rent_month),
  INDEX idx_rent_month_app (application_id),
  CONSTRAINT fk_rent_month_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
