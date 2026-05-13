import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

function LoginPage({ darkMode, onToggleDarkMode }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await apiClient.post(endpoint, { email, password });
      
      authLogin(response.data.token, response.data);
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
          {error && <div className="error-message">{error}</div>}
          <Button className="button" type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
          </Button>

          <p className="text-sm text-center mt-4">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-blue-600 hover:underline"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {isRegister ? 'Sign In' : 'Register Now'}
            </button>
          </p>
        </Card>
      </form>
    </div>
  );
}

export default LoginPage;
