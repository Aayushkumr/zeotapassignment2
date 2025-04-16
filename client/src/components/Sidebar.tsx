import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="nav-menu">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">📊</span>
              <span className="text">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">⬆️</span>
              <span className="text">Flat File to ClickHouse</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/export" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">⬇️</span>
              <span className="text">ClickHouse to Flat File</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/join" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="icon">🔄</span>
              <span className="text">JOIN Query Export</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;