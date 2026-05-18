-- Fix cascading deletes for messages table
-- The sender_id was NOT NULL but set to ON DELETE SET NULL, causing deletion failures.

-- 1. Alter messages table to CASCADE delete when a user is removed
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Also check reports table - reported_user_id is allowed to be NULL, so SET NULL is fine.
-- However, if we want to delete reports when a user is deleted, we could change it to CASCADE.
-- Given the requirement "permanently remove all associated data", CASCADE might be better for reports too.
-- But usually reports are kept for audit. Let's keep it as SET NULL for now as it's not breaking.

-- 3. Ensure caregiver_profiles has proper CASCADE (it already does in schema, but let's be safe)
-- ALTER TABLE caregiver_profiles DROP CONSTRAINT IF EXISTS caregiver_profiles_user_id_fkey;
-- ALTER TABLE caregiver_profiles ADD CONSTRAINT caregiver_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
