import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard';
import ImportPage from './pages/ImportPage.tsx';
import ExportPage from './pages/ExportPage.tsx';
import JoinPage from './pages/JoinPage.tsx';
import './App.css';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Router>
        <div className="app">
          <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="main-content">
            <Sidebar isOpen={sidebarOpen} />
            <div className={`content ${sidebarOpen ? 'with-sidebar' : ''}`}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/join" element={<JoinPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default App;
