import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await axios.get(`${baseUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });
        setUser(res.data);
      } catch (err) {
        console.log('No active session found or session expired.');
        setUser(null);
        // Clear legacy token if present
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (newToken, newUser) => {
    // Keep writing legacy token in case some components read it directly
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
    setUser(newUser);
  };

  const logout = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      await axios.post(`${baseUrl}/api/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (err) {
      console.error('Failed to log out on server:', err.message);
    } finally {
      // Clear local states and storage
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const isAuthenticated = !!user;
  const dummyToken = user ? 'cookie_auth_active' : null;

  return (
    <AuthContext.Provider value={{ user, token: dummyToken, loading, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
