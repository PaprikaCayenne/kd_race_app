// File: frontend/src/main-admin.jsx
// Version: v1.0.1 — Fixes missing Tailwind styles by importing global CSS
// Route: https://kd.paprikacayenne.com/admin
// Mounts: <AdminPage /> into #root
// Injected via: admin.html → <script type="module" src="/src/main-admin.jsx"></script>

import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPage from './pages/admin/AdminPage.jsx';
import './index.css'; // ✅ THIS WAS MISSING

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminPage />
  </React.StrictMode>
);
