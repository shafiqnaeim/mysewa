-- Account holder name for landlord online banking (shown to students when paying deposit)
ALTER TABLE properties ADD COLUMN account_holder VARCHAR(255) NULL AFTER account_number;
