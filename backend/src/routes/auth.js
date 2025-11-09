const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('../db');
const { generateToken, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find user by Google ID
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.id)
            .single();

          if (existingUser) {
            return done(null, existingUser);
          }

          // Create new user
          const email = profile.emails?.[0]?.value || `${profile.id}@gmail.com`;
          const name = profile.displayName || email.split('@')[0];

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              email,
              google_id: profile.id,
              name,
              role: 'staff'
            })
            .select()
            .single();

          if (insertError) {
            return done(insertError);
          }

          return done(null, newUser);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// Register endpoint
router.post('/register', async (req, res) => {
  const { email, password, name, inviteToken } = req.body;

  // Validate input
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    let userRole = 'staff'; // Default role
    let invitationId = null;

    // If invite token is provided, validate and use it
    if (inviteToken) {
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('id, email, role, expires_at, used')
        .eq('token', inviteToken)
        .single();

      if (inviteError || !invitation) {
        return res.status(400).json({ error: 'Invalid invitation token' });
      }

      if (invitation.used) {
        return res.status(400).json({ error: 'This invitation has already been used' });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This invitation has expired' });
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'Email does not match invitation' });
      }

      // Use role from invitation
      userRole = invitation.role;
      invitationId = invitation.id;
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role: userRole
      })
      .select('id, email, name, role, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Mark invitation as used
    if (invitationId) {
      await supabase
        .from('invitations')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', invitationId);
    }

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has password (might be Google OAuth only)
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account uses Google login. Please sign in with Google.'
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user info (without password hash)
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth login
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173?token=${token}`);
  }
);

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update user profile
router.put('/me', requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('id, email, name, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Get user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error: 'Cannot change password for Google OAuth accounts'
      });
    }

    // Verify current password
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints for user management

// Get all users (admin only)
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, google_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Email, name, and role are required' });
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or staff' });
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password if provided
    const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role
      })
      .select('id, email, name, role, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;

  if (!name && !role) {
    return res.status(400).json({ error: 'At least one field (name or role) is required' });
  }

  if (role && !['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or staff' });
  }

  // Don't allow changing own role
  if (parseInt(id) === req.user.id && role) {
    return res.status(403).json({ error: 'You cannot change your own role' });
  }

  try {
    const updates = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (role) updates.role = role;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, name, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  // Don't allow deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
