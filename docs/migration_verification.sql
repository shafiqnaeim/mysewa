-- MySewa identity verification schema (safe to re-run on existing databases)
-- Email verification uses users.is_verified; document workflow uses document_verification_status.

USE mysewa;

-- user_verification_documents
CREATE TABLE IF NOT EXISTS user_verification_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_type VARCHAR(32) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  uploaded_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_verification_doc (user_id, document_type),
  INDEX idx_user_verification_user (user_id),
  CONSTRAINT fk_user_verification_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- verification_submitted_at
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_submitted_at') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN verification_submitted_at DATETIME NULL AFTER document_verification_status'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- verification_rejection_reason
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_rejection_reason') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN verification_rejection_reason VARCHAR(1000) NULL AFTER verification_submitted_at'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
