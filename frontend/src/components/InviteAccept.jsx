import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './InviteAccept.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, register: authRegister } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to home
    if (user) {
      navigate('/');
      return;
    }

    // Validate invite token
    validateInvite();
  }, [token, user]);

  const validateInvite = async () => {
    try {
      const response = await axios.get(`${API_URL}/invitations/${token}`);
      setInviteData(response.data);
      setInviteValid(true);
    } catch (err) {
      console.error('Invite validation error:', err);
      setError(err.response?.data?.error || 'Invalid or expired invitation');
      setInviteValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const result = await authRegister(
        inviteData.email,
        password,
        name,
        token // Pass invite token to register
      );

      if (!result.success) {
        setError(result.error);
        setSubmitting(false);
      }
      // On success, authRegister will update auth state and redirect to home
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="invite-accept">
        <div className="invite-card">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!inviteValid) {
    return (
      <div className="invite-accept">
        <div className="invite-card">
          <div className="invite-header">
            <span className="flower-icon">🌻</span>
            <h1>Mahuti Tasks</h1>
            <span className="flower-icon">🌻</span>
          </div>

          <div className="error-container">
            <div className="error-icon">❌</div>
            <h2>Invalid Invitation</h2>
            <p className="error-message">{error}</p>
            <p className="error-help">
              This invitation may have expired or already been used. Please contact your administrator for a new invitation.
            </p>
            <button onClick={() => navigate('/')} className="btn-home">
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-accept">
      <div className="invite-card">
        <div className="invite-header">
          <span className="flower-icon">🌻</span>
          <h1>Mahuti Tasks</h1>
          <span className="flower-icon">🌻</span>
        </div>

        <h2>Welcome!</h2>
        <p className="invite-subtitle">
          You've been invited to join Mahuti Tasks as a <strong>{inviteData.role}</strong>
        </p>

        <div className="invite-info">
          <p><strong>Email:</strong> {inviteData.email}</p>
          <p><strong>Role:</strong> <span className={`role-badge role-${inviteData.role}`}>{inviteData.role.toUpperCase()}</span></p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="invite-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              disabled={submitting}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={submitting}
            />
          </div>

          <button type="submit" className="btn-accept" disabled={submitting}>
            {submitting ? 'Creating Account...' : '✨ Accept Invitation & Create Account'}
          </button>
        </form>

        <p className="invite-footer">
          By creating an account, you'll be able to access the Mahuti Tasks platform and manage weekly schedules.
        </p>
      </div>
    </div>
  );
}

export default InviteAccept;
