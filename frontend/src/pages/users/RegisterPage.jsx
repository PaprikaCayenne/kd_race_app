// File: frontend/src/pages/users/RegisterPage.jsx
// Version: v1.4.0 — Responsive layout, bottom-left logo, redirect if registered, polished CTA

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nickname: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(true);

  // Generate or reuse device ID from localStorage
  const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();

  useEffect(() => {
    localStorage.setItem('deviceId', deviceId);

    // Check if already registered
    axios
      .get(`/api/register/check?deviceId=${deviceId}`)
      .then((res) => {
        if (res?.data?.registered) {
          window.location.href = '/users/dashboard';
        } else {
          setChecking(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to check registration:', err);
        setChecking(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/register', {
        ...form,
        deviceId
      });

      localStorage.setItem('deviceId', deviceId);
      setSubmitted(true);
    } catch (err) {
      alert('Registration failed');
      console.error(err);
    }
  };

  if (submitted) {
    window.location.href = '/users/dashboard';
    return null;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking registration...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex flex-col items-center text-gray-800 relative">
      {/* Fixed logo in bottom-left corner */}
      <img
        src="/jll-logo.png"
        alt="JLL Logo"
        className="h-6 fixed bottom-4 left-4 opacity-80"
      />

      {/* Header */}
      <h1 className="text-3xl sm:text-4xl font-bold text-red-700 mb-2 text-center">
        🏁 Join the JLL Grand Gallop
      </h1>

      {/* Subtext */}
      <p className="text-gray-700 text-center mb-6 text-sm sm:text-base max-w-md">
        Register below to compete in our company race event.  
        You'll receive <strong>Lease Loons</strong> to place bets, and your nickname will show up on the leaderboard!
      </p>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-gray-200 p-6 rounded-xl shadow space-y-4"
      >
        <input
          type="text"
          required
          placeholder="First Name"
          className="w-full border border-gray-300 px-4 py-3 rounded text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Last Name"
          className="w-full border border-gray-300 px-4 py-3 rounded text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Nickname (for leaderboard)"
          className="w-full border border-gray-300 px-4 py-3 rounded text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
        />
        <button
          type="submit"
          className="w-full bg-red-700 text-white font-semibold text-lg py-3 rounded-lg hover:bg-red-800 transition active:scale-95"
        >
          🎟️ Register Now
        </button>
      </form>
    </div>
  );
}
