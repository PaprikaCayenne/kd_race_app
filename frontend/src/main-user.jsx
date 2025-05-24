// File: frontend/src/main-user.jsx
// Version: v1.0.0 — Entry point for /users UI (register + dashboard)

import React from 'react';
import ReactDOM from 'react-dom/client';
import UsersApp from './pages/UserRegister.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UsersApp />
  </React.StrictMode>
);
