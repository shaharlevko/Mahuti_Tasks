import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Check for token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      // Save token from URL to localStorage
      localStorage.setItem('mahuti_token', urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return urlToken;
    }

    // Otherwise, get from localStorage
    return localStorage.getItem('mahuti_token');
  });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Configure axios to include token in all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount or token change
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to load user:', error);
        // Token is invalid, clear it
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('mahuti_token', newToken);
      setToken(newToken);
      setUser(newUser);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (email, password, name, inviteToken = null) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        name,
        inviteToken
      });

      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('mahuti_token', newToken);
      setToken(newToken);
      setUser(newUser);

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('mahuti_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Check if user has a specific role
  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
  };

  // Check if user can edit (admin or manager)
  const canEdit = () => {
    return user && (user.role === 'admin' || user.role === 'manager');
  };

  // Check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    canEdit,
    isAdmin,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
