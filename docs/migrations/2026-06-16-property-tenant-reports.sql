-- Student maintenance / tenancy reports visible to the listing landlord (myProperty → landlord View listing).

CREATE TABLE IF NOT EXISTS property_tenant_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  application_id INT NOT NULL,
  student_id INT NOT NULL,
  report_body TEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_property_tenant_reports_property (property_id),
  INDEX idx_property_tenant_reports_student (student_id),
  CONSTRAINT fk_property_tenant_reports_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_property_tenant_reports_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_property_tenant_reports_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
