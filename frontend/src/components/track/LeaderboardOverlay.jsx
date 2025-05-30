// File: frontend/src/components/track/LeaderboardOverlay.jsx
// Version: v1.1.0 — Projector mode: inset, top-5, big fonts
// Date: 2025-05-30

import React from 'react';

export default function LeaderboardOverlay({ users }) {
  return (
    <div className="absolute top-60 left-[225px] w-96 bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl">
      <h2 className="text-4xl font-extrabold mb-6 flex items-center">
        <span className="mr-3">🏆</span> Leaderboard <span className="mr-3">🏆</span>
      </h2>
      <ol className="list-decimal list-inside text-3xl space-y-4">
        {users.slice(0, 5).map((u, i) => (
          <li key={u.id} className="flex justify-between">
            <span>{i + 1}. {u.nickname}</span>
            <span className="font-mono">{u.leaseLoons}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
