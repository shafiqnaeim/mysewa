-- Encrypted IC values (v1: + base64) exceed VARCHAR(50). Safe to run multiple times on mysewa.
USE mysewa;

ALTER TABLE users MODIFY COLUMN ic_number VARCHAR(255) NOT NULL;
