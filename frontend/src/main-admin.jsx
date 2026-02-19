// File: frontend/src/main-admin.jsx
// Version: v1.1.0 — Adds React Query provider

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import AdminPage from './pages/admin/AdminPage.jsx';
import { queryClient } from './lib/queryClient.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminPage />
    </QueryClientProvider>
  </React.StrictMode>
);
