// File: frontend/src/components/track/LeaderboardOverlay.jsx
// Version: v1.5.0 — Polished leaderboard visuals with lease loon currency styling
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
  const formatLoons = (value) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-US').format(num);
  };

  const baseClass = compact
    ? 'absolute p-3.5 rounded-2xl shadow-xl border border-amber-200 z-50 min-h-[240px]'
    : 'absolute p-6 rounded-2xl shadow-2xl z-50 border border-amber-200 min-h-[280px]';

  return (
    <div className={`${baseClass} bg-gradient-to-b from-[#fff9ee]/95 via-white/95 to-[#fef3c7]/90 backdrop-blur-[1px]`} style={panelStyle}>
      <div
        className={`flex items-center justify-between ${compact ? 'mb-3' : 'mb-4'} ${draggable ? 'cursor-move select-none' : ''}`}
        onMouseDown={draggable ? onDragStart : undefined}
      >
        <div className="flex items-center gap-2">
          <span className={`${compact ? 'text-xl' : 'text-2xl'} leading-none`} aria-hidden="true">🏆</span>
          <h2 className={`${compact ? 'text-xl' : 'text-3xl'} font-black tracking-tight text-amber-900`}>Leaderboard</h2>
        </div>
        {draggable && <span className="text-[10px] uppercase tracking-wide text-amber-700">Drag</span>}
      </div>

      <ol className={`${compact ? 'text-base space-y-2' : 'text-lg space-y-3'} list-none`}>
        {users.slice(0, 5).map((u, i) => {
          const isWinner = winnerName && u.nickname === winnerName;
          const rankBadge = i + 1;
          return (
            <li key={u.id} className="flex justify-between items-center gap-3 rounded-xl px-2.5 py-2 bg-white/80 border border-amber-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-black shrink-0">
                  {rankBadge}
                </span>
                <span className={isWinner ? 'font-black text-amber-700 winner-pop relative truncate' : 'truncate font-bold text-slate-800'}>
                  {u.nickname}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-black tracking-wide text-sm">
                L$ {formatLoons(u.leaseLoons)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
