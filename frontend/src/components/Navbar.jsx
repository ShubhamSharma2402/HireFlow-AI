import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <Zap className="logo-icon" size={24} />
          <span className="gradient-text">HireFlow AI</span>
        </Link>

        <div className="navbar-links desktop-only">
          <Link to="/">Home</Link>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
        </div>

        <div className="navbar-actions desktop-only">
          <Link to="/" className="btn btn-primary">Start Optimizing</Link>
        </div>

        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu glass-card">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <Link to="/" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
            Start Optimizing
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
