import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1>ClickHouse & Flat File Data Ingestion Tool</h1>
      
      <div className="intro">
        <p>
          Welcome to the Bidirectional Data Ingestion Tool for ClickHouse and Flat Files.
          This application allows you to easily transfer data between ClickHouse databases
          and various flat file formats.
        </p>
      </div>
      
      <div className="features">
        <h2>Features</h2>
        <ul>
          <li>
            <span className="feature-icon">⬆️</span>
            <div className="feature-text">
              <h3>Flat File to ClickHouse</h3>
              <p>Import data from CSV, TSV, or other flat files into a ClickHouse database.</p>
            </div>
          </li>
          <li>
            <span className="feature-icon">⬇️</span>
            <div className="feature-text">
              <h3>ClickHouse to Flat File</h3>
              <p>Export data from ClickHouse tables to flat files with selectable columns.</p>
            </div>
          </li>
          <li>
            <span className="feature-icon">🔄</span>
            <div className="feature-text">
              <h3>JOIN Query Export</h3>
              <p>Perform JOIN operations across multiple ClickHouse tables and export the results.</p>
            </div>
          </li>
          <li>
            <span className="feature-icon">🔍</span>
            <div className="feature-text">
              <h3>Data Preview</h3>
              <p>Preview data before import or export to ensure accuracy.</p>
            </div>
          </li>
          <li>
            <span className="feature-icon">🔐</span>
            <div className="feature-text">
              <h3>Secure Authentication</h3>
              <p>Connect to ClickHouse using either password or JWT token-based authentication.</p>
            </div>
          </li>
        </ul>
      </div>
      
      <div className="quick-start">
        <h2>Quick Start</h2>
        <div className="cards">
          <div className="card">
            <h3>Import Data</h3>
            <p>Upload a flat file and import its data into a ClickHouse table</p>
            <Link to="/import" className="btn">Start Import</Link>
          </div>
          <div className="card">
            <h3>Export Data</h3>
            <p>Export data from a ClickHouse table to a flat file</p>
            <Link to="/export" className="btn">Start Export</Link>
          </div>
          <div className="card">
            <h3>JOIN Tables</h3>
            <p>Execute JOIN queries across multiple tables and export results</p>
            <Link to="/join" className="btn">Start JOIN</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;