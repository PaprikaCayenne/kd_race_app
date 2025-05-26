// File: frontend/src/main-user.jsx
// Version: v1.1.0 — Loads user-facing mobile SPA (registration & dashboard)
// Route: https://kd.paprikacayenne.com/
// Mounts: <UsersApp /> into #root
// Injected via: users.html → <script type="module" src="./src/main-user.jsx"></script>

import React from 'react';
import ReactDOM from 'react-dom/client';
import UsersApp from './pages/UserRegister.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UsersApp />
  </React.StrictMode>
);
