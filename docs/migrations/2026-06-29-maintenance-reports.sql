-- Maintenance reports (categories, status workflow, landlord notes, timestamps)
CREATE TABLE IF NOT EXISTS maintenance_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  property_id INT NOT NULL,
  application_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  photo_url VARCHAR(1024) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  landlord_notes TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_maintenance_reports_student (student_id),
  INDEX idx_maintenance_reports_property (property_id),
  INDEX idx_maintenance_reports_status (status),
  CONSTRAINT fk_maintenance_reports_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_maintenance_reports_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_maintenance_reports_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
