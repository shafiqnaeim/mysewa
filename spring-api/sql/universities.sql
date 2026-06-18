-- MySewa: universities table (campus pins for distance calculations)
-- Run: mysql -u root -p mysewa < sql/universities.sql

USE mysewa;

CREATE TABLE IF NOT EXISTS universities (
  id          INT          NOT NULL AUTO_INCREMENT,
  code        VARCHAR(32)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  latitude    DOUBLE       NULL,
  longitude   DOUBLE       NULL,
  city        VARCHAR(255) NULL,
  state       VARCHAR(255) NULL,
  postcode    VARCHAR(16)  NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          NULL,
  updated_at  DATETIME(6)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_universities_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO universities (code, name, latitude, longitude, city, state, active, sort_order, updated_at)
VALUES
  ('UMT',    'Universiti Malaysia Terengganu (UMT)',                     5.408400, 103.082100, 'Kuala Terengganu', 'Terengganu', 1, 1, NOW(6)),
  ('UniSZA', 'Universiti Sultan Zainal Abidin (UniSZA)',                 5.394300, 103.102800, 'Kuala Terengganu', 'Terengganu', 1, 2, NOW(6)),
  ('ILPKT',  'Institut Latihan Perindustrian Kuala Terengganu (ILPKT)',  5.329400, 103.140600, 'Kuala Terengganu', 'Terengganu', 1, 3, NOW(6)),
  ('IPGM',   'Institut Pendidikan Guru Malaysia (IPGM)',                 5.401200, 103.088900, 'Kuala Terengganu', 'Terengganu', 1, 4, NOW(6))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  city = VALUES(city),
  state = VALUES(state),
  active = VALUES(active),
  sort_order = VALUES(sort_order),
  updated_at = VALUES(updated_at);
