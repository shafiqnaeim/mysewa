-- Saved properties + notifications (MySewa FYP)
-- Safe to run multiple times on mysewa.

CREATE TABLE IF NOT EXISTS saved_properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_saved_student_property (student_id, property_id),
  INDEX idx_saved_student (student_id),
  CONSTRAINT fk_saved_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
