// File: frontend/src/components/track/LeaderboardOverlay.jsx
// Version: v1.2.0 — Highlights winner with lightweight confetti pulse
// Date: 2026-02-18

import React from 'react';

export default function LeaderboardOverlay({ users, winnerName }) {
  return (
    <div className="absolute top-[260px] left-[8%] w-[clamp(260px,28vw,420px)] bg-white/90 p-6 rounded-2xl shadow-2xl z-50">
      <h2 className="text-5xl font-extrabold mb-6 flex items-center">
        <span className="mr-3">🏆</span> Leaderboard <span className="mr-3">🏆</span>
      </h2>
      <ol className="list-decimal list-inside text-2xl space-y-4">
        {users.slice(0, 5).map((u, i) => {
          const isWinner = winnerName && u.nickname === winnerName;
          return (
            <li key={u.id} className="flex justify-between items-center">
              <span className={isWinner ? 'font-black text-yellow-700 winner-pop relative' : ''}>{i + 1}. {u.nickname}</span>
              <span className="font-mono">{u.leaseLoons}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
