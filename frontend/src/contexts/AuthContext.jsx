import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(true);

  // Load user from Supabase and fetch their role from users table
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserWithRole(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserWithRole(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserWithRole = async (authUser) => {
    try {
      // Fetch user data from users table to get role
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading user data:', error);
        setUser(null);
      } else {
        // Combine auth user with database user data
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: userData.name || authUser.user_metadata?.name || authUser.email,
          role: userData.role || 'staff',
          ...userData
        });
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await loadUserWithRole(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (email, password, name, inviteToken = null) => {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Check if invitation exists and get role
      let role = 'staff'; // default role
      if (inviteToken) {
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', inviteToken)
          .eq('status', 'pending')
          .single();

        if (!inviteError && invitation) {
          role = invitation.role;

          // Mark invitation as used
          await supabase
            .from('invitations')
            .update({
              status: 'accepted',
              used_by: authData.user.id,
              used_at: new Date().toISOString()
            })
            .eq('id', invitation.id);
        }
      }

      // Create user record in users table
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: email,
            name: name,
            role: role,
          },
        ]);

      if (userError) {
        console.error('Error creating user record:', userError);
        // User auth was created but database record failed
        // They can still log in, we'll create the record on login
      }

      await loadUserWithRole(authData.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
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
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    canEdit,
    isAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
