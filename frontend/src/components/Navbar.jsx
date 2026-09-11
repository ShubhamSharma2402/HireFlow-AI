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
    const handleScroll = () => setScrolled(window.scrollY > 20);
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
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Zap className="logo-icon" size={24} />
          <span className="gradient-text">HireFlow AI</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="navbar-links desktop-only">
          <Link to="/">Home</Link>
          {user && <Link to="/jobs"><Briefcase size={15} /> Jobs</Link>}
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
        </div>

        {/* Desktop Actions */}
        <div className="navbar-actions desktop-only">
          {!loading && (
            user ? (
              <div className="user-menu">
                <div className="user-avatar">
                  <User size={16} />
                </div>
                <span className="user-name">{displayName}</span>
                <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/" className="btn btn-primary">Start Optimizing</Link>
              </>
            )
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu glass-card">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          {user && (
            <Link to="/jobs" onClick={() => setMobileMenuOpen(false)}>
              <Briefcase size={15} /> My Jobs
            </Link>
          )}
          {user && (
            <Link to="/automation" onClick={() => setMobileMenuOpen(false)}>
              🤖 Automation
            </Link>
          )}
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          {user ? (
            <button className="btn btn-secondary w-full" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary w-full" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
              <Link to="/" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
                Start Optimizing
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
