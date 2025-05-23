// File: frontend/src/pages/users/DashboardPage.jsx
// Version: v1.0.0 — Displays user's nickname and balance after registration

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const deviceId = localStorage.getItem('deviceId');

  useEffect(() => {
    if (!deviceId) return;

    axios.get(`/api/user/${deviceId}`)
      .then(res => setUser(res.data))
      .catch(err => {
        console.error('Failed to fetch user:', err);
        setUser(null);
      });
  }, [deviceId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center">
      <img src="/jll-logo.svg" alt="JLL Logo" className="h-12 mb-6" />
      <div className="bg-gray-50 p-6 rounded shadow max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.nickname}!</h1>
        <p className="text-gray-700">You have <span className="font-semibold text-green-600">{user.currency} Lease Loons</span>.</p>
        <p className="text-sm text-gray-500">Hang tight! You'll be able to place your bets here when the race opens.</p>
      </div>
    </div>
  );
}
