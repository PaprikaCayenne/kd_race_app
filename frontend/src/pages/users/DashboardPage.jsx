// File: frontend/src/pages/users/DashboardPage.jsx
// Version: v1.1.1 — JLL Grand Gallop dashboard with updated copy and theme

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
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center text-gray-900">
      <img src="/JLL_logo.png" alt="JLL Logo" className="h-12 mb-4" />
      <h1 className="text-2xl font-serif font-bold text-red-700 mb-2">
        Welcome to the Grand Gallop, {user.nickname}!
      </h1>

      <div className="bg-red-50 border border-red-200 rounded-xl shadow px-6 py-4 text-center w-full max-w-md space-y-4">
        <p className="text-lg">
          You have
          <span className="font-bold text-red-700 mx-2">
            {user.currency} Lease Loons
          </span>
          to bet with.
        </p>

        <p className="text-sm text-gray-600">
          Betting opens once the race is live!
        </p>
      </div>

      <div className="mt-8 w-full max-w-md text-center text-gray-500 text-sm">
        🐎 Watch for race announcements right here.
      </div>
    </div>
  );
}
