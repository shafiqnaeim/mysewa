-- MySewa core schema for Spring Boot + React (XAMPP/MySQL)
-- Safe to run multiple times.

CREATE DATABASE IF NOT EXISTS mysewa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mysewa;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  ic_number VARCHAR(50) NOT NULL,
  university VARCHAR(255) NOT NULL,
  university_id INT NULL,
  race VARCHAR(100) NULL,
  religion VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  program_study VARCHAR(255) NULL,
  academic_year VARCHAR(32) NULL,
  role VARCHAR(50) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  account_status VARCHAR(50) NULL DEFAULT 'active',
  document_verification_status VARCHAR(50) NULL DEFAULT 'pending',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_university (university)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If `users` already exists without profile extension columns:
-- ALTER TABLE users ADD COLUMN country VARCHAR(100) NULL AFTER religion;
-- ALTER TABLE users ADD COLUMN program_study VARCHAR(255) NULL AFTER country;
-- ALTER TABLE users ADD COLUMN academic_year VARCHAR(32) NULL AFTER program_study;

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  landlord_id INT NULL,
  name VARCHAR(255) NULL,
  type VARCHAR(100) NULL,
  location VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  rental_style VARCHAR(100) NULL,
  accepts_married_household TINYINT(1) NULL DEFAULT 0,
  price DECIMAL(10,2) NULL,
  images TEXT NULL,
  status VARCHAR(50) NULL DEFAULT 'available',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_properties_status (status),
  INDEX idx_properties_city_state (city, state),
  INDEX idx_properties_type (type),
  CONSTRAINT fk_properties_landlord
    FOREIGN KEY (landlord_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Future: student → landlord rental applications (API on hold). Hibernate entity: Application.
-- If you previously created bookings: RENAME TABLE bookings TO applications;
-- If you previously created property_rental_interests: migrate data then drop, or RENAME when compatible.
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  student_id INT NOT NULL,
  preferred_move_in VARCHAR(100) NULL,
  lease_end VARCHAR(32) NULL,
  lease_days INT NULL,
  lease_months INT NULL DEFAULT 12,
  landlord_deposit_amount DECIMAL(12,2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_applications_property_student (property_id, student_id),
  INDEX idx_applications_property (property_id),
  INDEX idx_applications_student (student_id),
  CONSTRAINT fk_applications_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_applications_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If `applications` already exists without lease columns, run migrations under docs/migrations/.
-- Legacy columns removed from the model (2026-06-10): message, occupant_count, study_work_summary, emergency_contact_phone.

CREATE TABLE IF NOT EXISTS application_rent_month_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  rent_year INT NOT NULL,
  rent_month INT NOT NULL COMMENT '1-12',
  amount DECIMAL(12,2) NULL,
  payment_channel VARCHAR(64) NULL,
  month_state VARCHAR(24) NOT NULL DEFAULT 'received',
  recorded_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rent_month_app_ym (application_id, rent_year, rent_month),
  INDEX idx_rent_month_app (application_id),
  CONSTRAINT fk_rent_month_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_rent_month_student_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  rent_year INT NOT NULL,
  rent_month INT NOT NULL COMMENT '1-12',
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(32) NULL,
  receipt_url VARCHAR(1024) NULL,
  UNIQUE KEY uk_student_rent_log_app_ym (application_id, rent_year, rent_month),
  INDEX idx_student_rent_log_app (application_id),
  CONSTRAINT fk_student_rent_log_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS property_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  student_id INT NOT NULL,
  rating INT NOT NULL,
  review_body TEXT NOT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_property_reviews_property_student (property_id, student_id),
  INDEX idx_property_reviews_property (property_id),
  CONSTRAINT fk_property_reviews_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_property_reviews_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If an older dev DB created `property_reviews` with a column named `comment`, rename it to match the API entity:
-- ALTER TABLE property_reviews CHANGE COLUMN comment review_body TEXT NOT NULL;

CREATE TABLE IF NOT EXISTS property_tenant_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  application_id INT NOT NULL,
  student_id INT NOT NULL,
  report_body TEXT NOT NULL,
  image_url VARCHAR(1024) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  received_at DATETIME NULL,
  resolved_at DATETIME NULL,
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

CREATE TABLE IF NOT EXISTS financial_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  student_id INT NOT NULL,
  property_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MYR',
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  external_ref VARCHAR(191) NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_financial_tx_application (application_id),
  INDEX idx_financial_tx_student (student_id),
  CONSTRAINT fk_financial_tx_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_financial_tx_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_financial_tx_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If `financial_transactions` existed before `external_ref`, run:
-- ALTER TABLE financial_transactions ADD COLUMN external_ref VARCHAR(191) NULL AFTER status;