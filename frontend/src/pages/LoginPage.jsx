import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

function LoginPage({ darkMode, onToggleDarkMode }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.substring(window.location.hash.indexOf('?')) : '');
    const mode = params.get('mode') || hashParams.get('mode') || 'signin';
    setIsRegister(mode === 'signup');
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await apiClient.post(endpoint, { email, password });
      
      authLogin(response.data.token, response.data);
      
      if (window.location.hash.includes('login')) {
         window.location.hash = '#/home';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-header">
        <label className="toggle-row">
          <span>Dark Mode</span>
          <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} />
        </label>
      </div>
      <form onSubmit={submit}>
        <Card className="login-card">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">Resilio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {isRegister ? 'Create your strategy account' : 'Strategy Resilience Studio'}
          </p>

          <div className="flex mb-6 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              className={`flex-1 pb-2 font-medium transition-colors ${!isRegister ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsRegister(false); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 pb-2 font-medium transition-colors ${isRegister ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsRegister(true); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <label>
            Email
            <input 
              value={email} 
              onChange={(event) => setEmail(event.target.value)} 
              type="email" 
              placeholder="you@example.com"
              required 
            />
          </label>
          <label>
            Password
            <input 
              value={password} 
              onChange={(event) => setPassword(event.target.value)} 
              type="password" 
              placeholder="••••••••"
              required 
            />
          </label>
          
          {isRegister && (
            <label>
              Confirm Password
              <input 
                value={confirmPassword} 
                onChange={(event) => setConfirmPassword(event.target.value)} 
                type="password" 
                placeholder="••••••••"
                required={isRegister}
              />
            </label>
          )}

          {error && <div className="error-message text-red-500 text-sm mb-4">{error}</div>}
          <Button className="button" type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
          </Button>
        </Card>
      </form>
    </div>
  );
}

export default LoginPage;