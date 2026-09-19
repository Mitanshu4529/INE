import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Search, LayoutDashboard, Package } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark"><Package size={19} /></span>
          <span>
            <strong>Pricewatch</strong>
            <small>INE STORE INTELLIGENCE</small>
          </span>
        </Link>

          <div className="nav-links">
            <Link
              to="/search"
              className={`nav-link ${
                isActive('/search')
                  ? 'active'
                  : ''
              }`}
            >
              <Search size={16} />
              Search
            </Link>

            <Link
              to="/dashboard"
              className={`nav-link ${
                isActive('/dashboard')
                  ? 'active'
                  : ''
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <span className="nav-status"><Activity size={13} /> Live catalog</span>
          </div>
      </div>
    </nav>
  );
};

export default Navbar;
