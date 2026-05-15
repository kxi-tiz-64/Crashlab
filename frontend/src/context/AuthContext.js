import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

// Utility to decode JWT token safely
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('resilio_token'));
  
  // Try to restore user state synchronously to prevent UI flashes
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('resilio_token');
    if (savedToken) {
      const decoded = decodeToken(savedToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        const savedUser = localStorage.getItem('resilio_user');
        return savedUser ? JSON.parse(savedUser) : { email: decoded.email, user_id: decoded.user_id };
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        const decoded = decodeToken(token);
        
        // Immediately log out if token is expired
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          console.error('Session expired');
          logout();
          setLoading(false);
          return;
        }

        // Set user from decoded token payload if available
        if (decoded.email) {
          setUser((prev) => prev || { email: decoded.email, user_id: decoded.user_id });
        }

        try {
          // Fetch full user data from backend to ensure synchronization
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          localStorage.setItem('resilio_user', JSON.stringify(response.data));
        } catch (err) {
          console.error('Session invalid according to server');
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    validateToken();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('resilio_token', newToken);
    
    // Store user data in localStorage to survive hard refreshes
    if (userData) {
      localStorage.setItem('resilio_user', JSON.stringify(userData));
    }
    
    // Fallback: If no userData is provided, try extracting from the token
    const decoded = decodeToken(newToken);
    const finalUser = userData || (decoded ? { email: decoded.email, user_id: decoded.user_id } : null);
    
    setToken(newToken);
    setUser(finalUser);
  };

  const logout = () => {
    // Clear both token and user state fully
    localStorage.removeItem('resilio_token');
    localStorage.removeItem('resilio_user');
    setToken(null);
    setUser(null);
  };

  const register = (newToken, userData) => {
    login(newToken, userData);
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
