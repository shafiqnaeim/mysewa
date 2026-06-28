-- Contact & payment fields for landlord property listings
ALTER TABLE properties ADD COLUMN contact_phone VARCHAR(20);
ALTER TABLE properties ADD COLUMN contact_email VARCHAR(100);
ALTER TABLE properties ADD COLUMN whatsapp_number VARCHAR(20);
ALTER TABLE properties ADD COLUMN payment_methods JSON;
ALTER TABLE properties ADD COLUMN payment_due_date VARCHAR(50) DEFAULT '1st of every month';
