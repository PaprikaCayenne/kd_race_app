// File: frontend/src/components/track/LeaderboardOverlay.jsx
// Version: v1.4.0 — Adds richer styling and optional drag handle while staying in infield
// Date: 2026-02-19

import React from 'react';

export default function LeaderboardOverlay({
  users,
  winnerName,
  compact = false,
  panelStyle = undefined,
  draggable = false,
  onDragStart = undefined
}) {
  const baseClass = compact
    ? 'absolute p-3 rounded-2xl shadow-xl border border-amber-200 z-50'
    : 'absolute p-6 rounded-2xl shadow-2xl z-50 border border-amber-200';

  return (
    <div className={`${baseClass} bg-gradient-to-b from-white/95 to-amber-50/90`} style={panelStyle}>
      <div
        className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'} ${draggable ? 'cursor-move select-none' : ''}`}
        onMouseDown={draggable ? onDragStart : undefined}
      >
        <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-amber-900`}>Leaderboard</h2>
        {draggable && <span className="text-[10px] uppercase tracking-wide text-amber-700">Drag</span>}
      </div>

      <ol className={`list-decimal list-inside ${compact ? 'text-sm space-y-1' : 'text-lg space-y-2'}`}>
        {users.slice(0, 5).map((u, i) => {
          const isWinner = winnerName && u.nickname === winnerName;
          return (
            <li key={u.id} className="flex justify-between items-center gap-3 rounded-md px-2 py-1 bg-white/70">
              <span className={isWinner ? 'font-black text-amber-700 winner-pop relative truncate' : 'truncate font-semibold text-slate-800'}>
                {i + 1}. {u.nickname}
              </span>
              <span className="font-mono text-slate-900 shrink-0">{u.leaseLoons}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
