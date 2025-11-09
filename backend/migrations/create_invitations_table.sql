-- Create invitations table for user invitation system
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT invitation_role_check CHECK (role IN ('admin', 'manager', 'staff'))
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Create index on used status for filtering pending invites
CREATE INDEX IF NOT EXISTS idx_invitations_used ON invitations(used);
