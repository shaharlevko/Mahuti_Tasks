-- Migration: Add profile_picture_url column to users table
-- Purpose: Store Google profile picture URLs for users who authenticate with Google OAuth
-- Date: 2025-01-10

-- Add profile_picture_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Add a comment to document the column
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture from Google OAuth or other source';
