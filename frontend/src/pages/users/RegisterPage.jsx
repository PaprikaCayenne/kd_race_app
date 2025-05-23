// File: frontend/src/pages/users/RegisterPage.jsx
// Version: v1.0.1 — User registration form that submits deviceId and redirects to dashboard

import { useState } from 'react';
import axios from 'axios';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nickname: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const deviceId = window.localStorage.getItem('deviceId') || crypto.randomUUID();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/register', {
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <img src="/jll-logo.svg" alt="JLL Logo" className="h-12 mb-6" />
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-gray-50 p-6 rounded shadow space-y-4">
        <h1 className="text-2xl font-semibold text-gray-800">Join the Race</h1>
        <input
          type="text"
          required
          placeholder="First Name"
          className="w-full border px-3 py-2 rounded"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Last Name"
          className="w-full border px-3 py-2 rounded"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Nickname (used for leaderboard)"
          className="w-full border px-3 py-2 rounded"
          value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
        />
        <button type="submit" className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
          Register
        </button>
      </form>
    </div>
  );
}
