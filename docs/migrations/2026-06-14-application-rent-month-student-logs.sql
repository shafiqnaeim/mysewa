-- Student self-tracking: "I sent rent" for a month (does not replace landlord paid/unavailable records).
CREATE TABLE IF NOT EXISTS application_rent_month_student_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  rent_year INT NOT NULL,
  rent_month INT NOT NULL COMMENT '1-12',
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_rent_log_app_ym (application_id, rent_year, rent_month),
  INDEX idx_student_rent_log_app (application_id),
  CONSTRAINT fk_student_rent_log_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
