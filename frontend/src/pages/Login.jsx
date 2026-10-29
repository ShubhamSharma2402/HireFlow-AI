import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
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
            <h1>Sign in to HireFlow AI</h1>
            <p className="text-muted">
              Sign in with your Google account to access AI-powered agentic resume optimization, ATS scoring, and interview prep.
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="login-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="google-login-action">
            <button
              type="button"
              className="btn btn-primary google-submit-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '0.95rem 1.5rem',
                fontSize: '1.05rem',
                fontWeight: '600',
              }}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm" /> Connecting with Google...
                </span>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15 0 12 0 7.35 0 3.39 2.67 1.5 6.56l3.86 3C6.27 7.02 8.89 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.73z"/>
                    <path fill="#FBBC05" d="M5.36 14.52c-.25-.75-.39-1.56-.39-2.39 0-.83.14-1.64.39-2.39L1.5 6.74C.54 8.72 0 10.93 0 13.25c0 2.31.54 4.52 1.5 6.51l3.86-3.24z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.11 0-5.73-1.98-6.64-4.96l-3.86 3C3.39 21.33 7.35 24 12 24z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>

          <p className="login-terms-note text-muted" style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', lineHeight: 1.4 }}>
            By signing in, you agree to our terms of service and ATS resume optimization guidelines.
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
