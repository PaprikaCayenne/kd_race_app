// File: frontend/src/pages/UserRegister.jsx
// Version: v1.0.4 — Adds basename for correct subpath routing

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterPage from './users/RegisterPage';
import DashboardPage from './users/DashboardPage';

function UsersApp() {
  return (
    <Router basename="/users">
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default UsersApp;
