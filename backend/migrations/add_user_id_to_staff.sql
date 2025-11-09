-- Add user_id column to staff table
-- This creates a 1:1 relationship between users and staff members
-- When a user is deleted, their linked staff member is also deleted (CASCADE)

-- Add user_id column with foreign key constraint
ALTER TABLE staff
ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- Add comment for documentation
COMMENT ON COLUMN staff.user_id IS 'Optional 1:1 link to users table. When user is deleted, staff member is also deleted (CASCADE).';
