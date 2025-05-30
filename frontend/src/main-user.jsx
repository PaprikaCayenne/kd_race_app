// File: frontend/src/main-user.jsx
// Version: v1.3.0 — Loads full SPA at root: / and /dashboard

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/users/RegisterPage.jsx';
import DashboardPage from './pages/users/DashboardPage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
