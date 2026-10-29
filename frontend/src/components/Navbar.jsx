import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Menu, X, LogOut, Briefcase, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, mongoUser, logout, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setMobileMenuOpen(false);
  };

  const displayName = mongoUser?.name || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-logo">
          <Zap className="logo-icon" size={20} />
          <span>HireFlow AI</span>
          <span className="brand-pill">Agentic</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="navbar-links desktop-only">
          {user && <Link to="/">Optimization Hub</Link>}
          {user && <Link to="/jobs"><Briefcase size={14} /> Application History</Link>}
        </div>

        {/* Desktop Actions */}
        <div className="navbar-actions desktop-only">
          {!loading && (
            user ? (
              <div className="user-menu">
                <div className="user-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{displayName}</span>
                <button className="btn btn-secondary logout-btn" onClick={handleLogout} title="Sign Out">
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                Sign in with Google
              </Link>
            )
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {user && <Link to="/" onClick={() => setMobileMenuOpen(false)}>Optimization Hub</Link>}
          {user && (
            <Link to="/jobs" onClick={() => setMobileMenuOpen(false)}>
              <Briefcase size={14} /> Application History
            </Link>
          )}
          {user ? (
            <button className="btn btn-secondary w-full" onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
              Sign in with Google
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
