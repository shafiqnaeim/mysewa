-- Bank & QR payment details for conditional payment methods
ALTER TABLE properties ADD COLUMN bank_name VARCHAR(100);
ALTER TABLE properties ADD COLUMN account_number VARCHAR(50);
ALTER TABLE properties ADD COLUMN qr_code_url VARCHAR(500);
