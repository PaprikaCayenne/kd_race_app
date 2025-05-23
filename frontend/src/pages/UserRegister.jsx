// File: frontend/src/pages/UserRegister.jsx
// Version: v1.0.3 — Ensures correct default export for main-user.jsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterPage from './users/RegisterPage';
import DashboardPage from './users/DashboardPage';

function UsersApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default UsersApp;
