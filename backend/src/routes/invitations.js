const express = require('express');
const crypto = require('crypto');
const supabase = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendInvitationEmail } = require('../services/email');

const router = express.Router();

// Generate secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create and send invitation (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, role } = req.body;

  // Validate input
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or staff' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id, used')
      .eq('email', email)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return res.status(409).json({
        error: 'An active invitation already exists for this email. Please revoke it first or resend it.'
      });
    }

    // Generate unique token
    const token = generateToken();

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create invitation
    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email,
        token,
        role,
        invited_by: req.user.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // Send invitation email
    try {
      await sendInvitationEmail(email, token, role, req.user.name);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
      return res.status(201).json({
        message: 'Invitation created but email failed to send. You can resend it later.',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at
        }
      });
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at
      }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all invitations (admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        created_at,
        expires_at,
        used,
        used_at,
        users:invited_by (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    // Format the response
    const formattedInvitations = invitations.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      invited_by: invite.users?.name || 'Unknown',
      created_at: invite.created_at,
      expires_at: invite.expires_at,
      used: invite.used,
      used_at: invite.used_at,
      is_expired: new Date(invite.expires_at) < new Date(),
      status: invite.used
        ? 'used'
        : new Date(invite.expires_at) < new Date()
          ? 'expired'
          : 'pending'
    }));

    res.json(formattedInvitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation by token (public - for validation)
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, email, role, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if already used
    if (invitation.used) {
      return res.status(400).json({ error: 'This invitation has already been used' });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
      expires_at: invitation.expires_at
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend invitation email (admin only)
router.post('/:id/resend', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, email, token, role, used, expires_at')
      .eq('id', id)
      .single();

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.used) {
      return res.status(400).json({ error: 'Cannot resend a used invitation' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Cannot resend an expired invitation. Create a new one instead.' });
    }

    // Resend email
    try {
      await sendInvitationEmail(invitation.email, invitation.token, invitation.role, req.user.name);
      res.json({ message: 'Invitation email resent successfully' });
    } catch (emailError) {
      console.error('Error resending invitation email:', emailError);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke/delete invitation (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error revoking invitation:', error);
      return res.status(500).json({ error: 'Failed to revoke invitation' });
    }

    res.json({ message: 'Invitation revoked successfully' });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
