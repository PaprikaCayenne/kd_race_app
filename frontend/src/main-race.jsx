// File: frontend/src/main-race.jsx
// Version: v1.1.0 — Loads projector-facing race UI
// Route: https://kd.paprikacayenne.com/race
// Mounts: <App /> into #root
// Injected via: race.html → <script type="module" src="/src/main-race.jsx"></script>

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
