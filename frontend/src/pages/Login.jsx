import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!formData.name.trim()) throw new Error('Please enter your name.');
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signup(formData.email, formData.password, formData.name.trim());
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please log in.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" />

      <div className="login-container fade-in-up">
        {/* Logo */}
        <div className="login-logo">
          <Zap className="logo-icon" size={28} />
          <span className="gradient-text">HireFlow AI</span>
        </div>

        {/* Card */}
        <div className="login-card glass-card">
          <div className="login-header">
            <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
            <p className="text-muted">
              {mode === 'login'
                ? 'Sign in to access your AI job assistant'
                : 'Start your agentic job hunt today'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Log In
            </button>
            <button
              className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    className="input-field with-icon"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="input-field with-icon"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoFocus={mode === 'login'}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input-field with-icon with-icon-right"
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={mode === 'signup' ? 6 : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary google-submit-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.75rem' }}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15 0 12 0 7.35 0 3.39 2.67 1.5 6.56l3.86 3C6.27 7.02 8.89 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.73z"/>
              <path fill="#FBBC05" d="M5.36 14.52c-.25-.75-.39-1.56-.39-2.39 0-.83.14-1.64.39-2.39L1.5 6.74C.54 8.72 0 10.93 0 13.25c0 2.31.54 4.52 1.5 6.51l3.86-3.24z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.11 0-5.73-1.98-6.64-4.96l-3.86 3C3.39 21.33 7.35 24 12 24z"/>
            </svg>
            Continue with Google
          </button>

          {/* Switch mode */}
          <p className="login-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="link-btn"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>

        {/* Features hint */}
        <div className="login-features">
          {['🤖 Multi-agent AI', '📊 ATS Optimization', '🎯 Smart Job Matching'].map((f, i) => (
            <span key={i} className="feature-pill">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
