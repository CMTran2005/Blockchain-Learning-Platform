import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { isAdmin } from '../utils/api';

const Navbar = ({ account, onConnect }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, toggleLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState({ displayName: '', avatarUrl: '' });
  const dropdownRef = useRef(null);

  const loadProfile = useCallback(() => {
    if (account) {
      const saved = localStorage.getItem(`profile_${account}`);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        setProfile({
          displayName: `${account.substring(0, 6)}...${account.substring(account.length - 4)}`,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${account}`
        });
      }
    }
  }, [account]);

  useEffect(() => {
    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, [account, loadProfile]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const shortAddress = account
    ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
    : '';

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-icon">⬡</span>
          <span>Web3<span className="brand-accent">Learn</span></span>
        </Link>

        <div className={`nav-links ${mobileOpen ? 'nav-links-open' : ''}`}>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            {t("nav_discovery")}
          </Link>
          {account && (
            <Link to="/my-courses" className={`nav-link ${location.pathname === '/my-courses' ? 'active' : ''}`}>
              {t("nav_my_learning")}
            </Link>
          )}
          {account && isAdmin(account) && (
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              🛠 Admin
            </Link>
          )}
        </div>

        <div className="nav-actions">
          <button className="lang-btn" onClick={toggleLanguage} title="Switch language">
            {lang === 'en' ? '🇺🇸 EN' : '🇻🇳 VN'}
          </button>

          {account ? (
            <div className="user-menu" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <img src={profile.avatarUrl} alt="Avatar" className="avatar-small" />
              <span className="user-name">{profile.displayName || shortAddress}</span>
              <span className={`chevron ${dropdownOpen ? 'chevron-up' : ''}`}>▾</span>

              {dropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-address">
                    <span className="dot-green"></span>
                    {shortAddress}
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-item" onClick={() => navigate('/profile')}>
                    👤 {t("nav_edit_profile")}
                  </div>
                  <div className="dropdown-item" onClick={() => navigate('/my-courses')}>
                    📚 {t("nav_my_courses")}
                  </div>
                  {isAdmin(account) && (
                    <div className="dropdown-item" onClick={() => navigate('/admin')}>
                      🛠 Admin Dashboard
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button className="wallet-btn" onClick={onConnect}>
              <span className="wallet-btn-icon">🦊</span>
              {t("nav_connect")}
            </button>
          )}

          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className={`hamburger-bar ${mobileOpen ? 'bar-open-1' : ''}`}></span>
            <span className={`hamburger-bar ${mobileOpen ? 'bar-open-2' : ''}`}></span>
            <span className={`hamburger-bar ${mobileOpen ? 'bar-open-3' : ''}`}></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
