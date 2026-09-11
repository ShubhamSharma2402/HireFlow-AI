import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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
      navigate('/');
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('popup-closed') || msg.includes('cancelled')) {
        setError('Sign-in was cancelled. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setError('Popup was blocked. Please allow popups for this site.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Ambient background glow */}
      <div className="login-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-container">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="login-brand-name gradient-text">HireFlow AI</span>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h1>Welcome to HireFlow</h1>
            <p>Access your AI-powered multi-agent job application platform</p>
          </div>

          {/* Features list */}
          <div className="login-features-list">
            {[
              { icon: '🤖', text: 'Multi-Agent Resume Optimization' },
              { icon: '🎯', text: 'Real-time ATS Score & Keyword Gap Analysis' },
              { icon: '📊', text: 'Live Job Discovery via Adzuna API' },
              { icon: '✏️', text: 'Tailored Cover Letters & Interview Q&A' },
            ].map((f, i) => (
              <div key={i} className="login-feature-item">
                <span className="login-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <span className="google-btn-loading">
                <span className="btn-spinner" />
                Signing in...
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" className="google-btn-icon">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15 0 12 0 7.35 0 3.39 2.67 1.5 6.56l3.86 3C6.27 7.02 8.89 5.04 12 5.04z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.73z"/>
                  <path fill="#FBBC05" d="M5.36 14.52c-.25-.75-.39-1.56-.39-2.39 0-.83.14-1.64.39-2.39L1.5 6.74C.54 8.72 0 10.93 0 13.25c0 2.31.54 4.52 1.5 6.51l3.86-3.24z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.11 0-5.73-1.98-6.64-4.96l-3.86 3C3.39 21.33 7.35 24 12 24z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="login-footer-text">
            Secure authentication powered by Firebase. No password required.
          </p>
        </div>

        {/* Bottom tagline */}
        <p className="login-tagline">
          Engineered for developers • Multi-Agent Automation
        </p>
      </div>
    </div>
  );
};

export default Login;
