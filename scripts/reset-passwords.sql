-- =============================================================================
-- MySewa — Reset user passwords to demo credentials
-- =============================================================================
-- Run against the mysewa database, e.g.:
--   mysql -u root -p mysewa < scripts/reset-passwords.sql
--
-- After running:
--   student  → Student123
--   landlord → Landlord123
--   admin    → Admin123
--
-- Hashes generated with jBCrypt (cost 10), same as AuthService / bootstrap runners.
-- =============================================================================

USE mysewa;

-- Students
UPDATE users
SET password = '$2a$10$oFRB8gF5DsmvgSjac8INCu3p3dshP8G.RqkfK3Uo2SOJvHZqbbKe2'
WHERE LOWER(role) = 'student';

-- Landlords
UPDATE users
SET password = '$2a$10$CjzMPx6MwAk9raUt7GoX8e7wzblDwYLTSQrfcSj74NEzdUvs9Kdre'
WHERE LOWER(role) = 'landlord';

-- Admins
UPDATE users
SET password = '$2a$10$.KcbrGZlWYopUZtTvBwvveMZywZ7tOZndfVTSlC8TP5AGFLWuGR36'
WHERE LOWER(role) = 'admin';

-- Optional: clear password-reset tokens so old reset links stop working
UPDATE users
SET password_reset_token = NULL,
    password_reset_expires_at = NULL
WHERE password_reset_token IS NOT NULL;

SELECT role, COUNT(*) AS users_updated
FROM users
GROUP BY role
ORDER BY role;
