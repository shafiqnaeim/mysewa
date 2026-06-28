-- Optional message from landlord when approving or rejecting an application.
ALTER TABLE applications
  ADD COLUMN landlord_message VARCHAR(500) NULL AFTER landlord_deposit_amount;
