import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>
              Something went wrong loading this view
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. Your optimization data has been preserved.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} /> Retry
              </button>
              <a
                href="/"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                <Home size={16} /> Return to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
