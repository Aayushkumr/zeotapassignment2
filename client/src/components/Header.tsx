import React from 'react';
import './Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button 
            className="menu-toggle" 
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <h1 className="app-title">ClickHouse Tools</h1>
        </div>
        
        <div className="header-right">
          {/* You can add user profile or other elements here if needed */}
        </div>
      </div>
    </header>
  );
}

export default Header;