import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './UserManager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function UserManager() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading

    if (!isAdmin()) {
      navigate('/');
    } else {
      loadData();
    }
  }, [user, authLoading, isAdmin, navigate]);

  const loadData = async () => {
    try {
      const [usersRes, invitesRes] = await Promise.all([
        axios.get(`${API_URL}/auth/users`),
        axios.get(`${API_URL}/invitations`).catch(err => {
          console.warn('Invitations table may not exist yet:', err);
          return { data: [] };
        })
      ]);

      setUsers(usersRes.data);
      setInvitations(invitesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to load users and invitations';

      // Show specific error for missing table
      if (errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
        alert('⚠️ Setup Required:\n\nThe invitations table has not been created yet in Supabase.\n\nPlease run the SQL migration in your Supabase dashboard.\n\nCheck the console for the SQL script.');
        console.log('\n=== RUN THIS SQL IN SUPABASE ===\n\n' +
          'CREATE TABLE IF NOT EXISTS invitations (\n' +
          '  id SERIAL PRIMARY KEY,\n' +
          '  email VARCHAR(255) NOT NULL,\n' +
          '  token VARCHAR(255) NOT NULL UNIQUE,\n' +
          '  role VARCHAR(50) NOT NULL,\n' +
          '  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,\n' +
          '  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n' +
          '  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,\n' +
          '  used BOOLEAN DEFAULT false,\n' +
          '  used_at TIMESTAMP WITH TIME ZONE,\n' +
          '  CONSTRAINT invitation_role_check CHECK (role IN (\'admin\', \'manager\', \'staff\'))\n' +
          ');\n\n' +
          'CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);\n' +
          'CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);\n' +
          'CREATE INDEX IF NOT EXISTS idx_invitations_used ON invitations(used);\n\n' +
          '=================================\n');
      } else {
        alert(errorMsg);
      }
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/auth/users/${userId}`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert(error.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/auth/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail || !inviteRole) {
      alert('Please enter email and select a role');
      return;
    }

    setSendingInvite(true);
    try {
      await axios.post(`${API_URL}/invitations`, {
        email: inviteEmail,
        role: inviteRole
      });

      setInviteEmail('');
      setInviteRole('staff');
      await loadData(); // Reload to show new invite
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Error sending invite:', error);
      alert(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      await axios.post(`${API_URL}/invitations/${inviteId}/resend`);
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Error resending invite:', error);
      alert(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const handleRevokeInvite = async (inviteId, email) => {
    if (!confirm(`Are you sure you want to revoke the invitation for "${email}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/invitations/${inviteId}`);
      setInvitations(invitations.filter(inv => inv.id !== inviteId));
    } catch (error) {
      console.error('Error revoking invite:', error);
      alert(error.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAdmin()) {
    return null;
  }

  const pendingInvites = invitations.filter(inv => !inv.used && new Date(inv.expires_at) > new Date());

  return (
    <div className="user-manager">
      <header className="user-manager-header">
        <div className="header-content">
          <div className="header-left">
            <span className="flower-icon">🌻</span>
            <h1>User Management</h1>
            <span className="flower-icon">🌻</span>
          </div>
          <button className="btn-back" onClick={() => navigate('/')}>
            ← Back to Schedule
          </button>
        </div>
      </header>

      <div className="user-manager-content">
        {/* Users List */}
        <section className="users-section">
          <h2>👥 Users ({users.length})</h2>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="role-select"
                        disabled={u.id === user?.id}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn-delete"
                        disabled={u.id === user?.id}
                        title={u.id === user?.id ? 'Cannot delete yourself' : 'Delete user'}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Send Invite */}
        <section className="invite-section">
          <h2>📧 Send Invitation</h2>
          <form onSubmit={handleSendInvite} className="invite-form">
            <div className="form-group">
              <label htmlFor="invite-email">Email Address</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={sendingInvite}
              />
            </div>
            <div className="form-group">
              <label htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={sendingInvite}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="submit" className="btn-send-invite" disabled={sendingInvite}>
                {sendingInvite ? '📤 Sending...' : '📤 Send Invitation'}
              </button>
            </div>
          </form>
        </section>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <section className="pending-invites-section">
            <h2>📬 Pending Invitations ({pendingInvites.length})</h2>
            <div className="table-container">
              <table className="invites-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited By</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map(invite => (
                    <tr key={invite.id}>
                      <td>{invite.email}</td>
                      <td>
                        <span className={`role-badge role-${invite.role}`}>
                          {invite.role}
                        </span>
                      </td>
                      <td>{invite.invited_by}</td>
                      <td>{new Date(invite.created_at).toLocaleDateString()}</td>
                      <td>{new Date(invite.expires_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleResendInvite(invite.id)}
                            className="btn-resend"
                            title="Resend invitation email"
                          >
                            🔄 Resend
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(invite.id, invite.email)}
                            className="btn-revoke"
                            title="Revoke invitation"
                          >
                            ❌ Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default UserManager;
