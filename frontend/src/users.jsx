// File: frontend/src/users.jsx
// Version: v1.0.1 — Fixed default import path for users.html entrypoint

import React from 'react';
import ReactDOM from 'react-dom/client';
import UsersApp from './pages/UserRegister.jsx'; // ✅ Correct import
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UsersApp />
  </React.StrictMode>
);
