// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
// ✅ Import your updated API helpers
import { authAPI, saveAuth, clearAuth } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ UPDATED: Use authAPI.getMe() which calls /users/profile
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ This now calls GET /api/users/profile (not /auth/me)
      const response = await authAPI.getMe();
      
      if (response?.data?.user) {
        setUser(response.data.user);
        // Also save to localStorage for persistence
        saveAuth({ user: response.data.user });
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to load user');
      
      // Only clear auth if it's a true 401 (not a 404 from wrong endpoint)
      if (err.status === 401) {
        clearAuth();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ UPDATED: Login function using authAPI
  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      // ✅ Calls POST /api/users/login
      const response = await authAPI.login(credentials);
      
      if (response?.data?.token && response?.data?.user) {
        saveAuth(response.data); // Save token + user
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response?.data?.message || 'Login failed' };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.userMessage || err.message || 'Login failed');
      return { success: false, error: err.userMessage || err.message };
    }
  }, []);

  // ✅ UPDATED: Signup function
  const signup = useCallback(async (userData) => {
    try {
      setError(null);
      // ✅ Calls POST /api/users/signup
      const response = await authAPI.signup(userData);
      
      if (response?.data?.token && response?.data?.user) {
        saveAuth(response.data);
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response?.data?.message || 'Signup failed' };
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.userMessage || err.message || 'Signup failed');
      return { success: false, error: err.userMessage || err.message };
    }
  }, []);

  // ✅ UPDATED: Logout function
  const logout = useCallback(async () => {
    try {
      // ✅ Calls POST /api/users/logout (optional, can skip if not implemented)
      await authAPI.logout().catch(() => {}); // Ignore errors on logout
    } finally {
      clearAuth();
      setUser(null);
    }
  }, []);

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser, user]);

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser: fetchUser, // Expose for manual refresh
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;