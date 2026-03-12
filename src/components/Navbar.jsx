import React, { useState, useEffect } from 'react';
import './Navbar.css';
import logo from '../assets/vinlogo.png';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <div className="logo-wrapper">
            <img src={logo} alt="Expense Manager Logo" className="logo-image" />
            <div className="logo-text">
              <span className="logo-main">Expense</span>
              <span className="logo-sub">Management System</span>
            </div>
          </div>
        </div>

        <div className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-menu">
            <li className="nav-item">
              <a 
                href="https://invoice-system-orpin.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`nav-link ${hoveredLink === 'invoice' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredLink('invoice')}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={closeMobileMenu}
              >
                <span className="link-text">Vinsol Invoice</span>
                <span className="link-hover-effect"></span>
              </a>
            </li>
            <li className="nav-item">
              <a 
                href="https://vin-sol.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`nav-link ${hoveredLink === 'vinsol' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredLink('vinsol')}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={closeMobileMenu}
              >
                <span className="link-text">Visit Vinsol</span>
                <span className="link-hover-effect"></span>
              </a>
            </li>
            <li className="nav-item">
              <a 
                href="https://ruqaba.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`nav-link ${hoveredLink === 'ruqaba' ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredLink('ruqaba')}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={closeMobileMenu}
              >
                <span className="link-text">Visit Ruqaba</span>
                <span className="link-hover-effect"></span>
              </a>
            </li>
          </ul>
        </div>

        <div 
          className={`navbar-mobile-toggle ${mobileMenuOpen ? 'active' : ''}`} 
          onClick={toggleMobileMenu}
        >
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`} 
        onClick={closeMobileMenu}
      ></div>
    </nav>
  );
};

export default Navbar;