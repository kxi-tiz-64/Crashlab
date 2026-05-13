import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('resilio_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch (err) {
          console.error('Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('resilio_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('resilio_token');
    setToken(null);
    setUser(null);
  };

  const register = (newToken, userData) => {
    localStorage.setItem('resilio_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
