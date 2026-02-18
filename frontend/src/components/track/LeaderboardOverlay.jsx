// File: frontend/src/components/track/LeaderboardOverlay.jsx
// Version: v1.3.0 — Supports external panel positioning with safe-area bounds
// Date: 2026-02-18

import React from 'react';

export default function LeaderboardOverlay({ users, winnerName, compact = false, panelStyle = undefined }) {
  const baseClass = compact
    ? 'w-full p-4 rounded-xl shadow-xl'
    : 'absolute p-6 rounded-2xl shadow-2xl z-50';

  return (
    <div className={`${baseClass} bg-white/90`} style={panelStyle}>
      <h2 className={`${compact ? 'text-2xl mb-3' : 'text-4xl mb-4'} font-extrabold flex items-center`}>
        <span className="mr-3">🏆</span> Leaderboard <span className="ml-3">🏆</span>
      </h2>
      <ol className={`list-decimal list-inside ${compact ? 'text-sm space-y-1' : 'text-lg space-y-2'}`}>
        {users.slice(0, 5).map((u, i) => {
          const isWinner = winnerName && u.nickname === winnerName;
          return (
            <li key={u.id} className="flex justify-between items-center gap-3">
              <span className={isWinner ? 'font-black text-yellow-700 winner-pop relative truncate' : 'truncate'}>{i + 1}. {u.nickname}</span>
              <span className="font-mono shrink-0">{u.leaseLoons}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
