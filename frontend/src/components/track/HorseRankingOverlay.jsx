// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.6.0 — Taller race panel rows with larger horse sprites and stronger contrast
// Date: 2026-02-19

import React from 'react';
import HorseSprite from '../HorseSprite';

export default function HorseRankingOverlay({
  ranking,
  raceName = 'Heat',
  panelStyle = undefined,
  draggable = false,
  onDragStart = undefined
}) {
  return (
    <div
      className="absolute bg-gradient-to-b from-[#f5f9ff]/95 via-[#fbfdff]/95 to-[#eef5ff]/92 border border-sky-200 p-3.5 rounded-2xl shadow-2xl z-50 animate-fadeIn"
      style={panelStyle}
    >
      <div
        className={`flex items-center justify-between mb-2 ${draggable ? 'cursor-move select-none' : ''}`}
        onMouseDown={draggable ? onDragStart : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none" aria-hidden="true">🏁</span>
          <h2 className="text-lg font-black text-slate-900 truncate tracking-tight">{raceName}</h2>
        </div>
        {draggable && <span className="text-[10px] text-slate-500 uppercase tracking-wide">Drag</span>}
      </div>

      {ranking.length === 0 ? (
        <div className="rounded-xl border border-sky-100 bg-white/85 px-3 py-4 text-sm font-semibold text-slate-600">
          Waiting for live heat order...
        </div>
      ) : (
        <ol className="space-y-2 text-sm">
          {ranking.map((h, i) => {
            const badgeColor = h.saddleHex
              ? { backgroundColor: h.saddleHex }
              : { backgroundColor: '#888' };

            return (
              <li
                key={h.id}
                className="flex items-center px-2 py-1.5 bg-white/92 rounded-xl shadow-sm border border-sky-100 gap-2"
              >
                <span
                  className="text-white text-xs font-black px-2 py-1 rounded-full shrink-0 min-w-7 text-center"
                  style={badgeColor}
                >
                  {i + 1}
                </span>
                <HorseSprite bodyHex={h.bodyHex} saddleHex={h.saddleHex} alt={h.name} className="w-14 h-14 shrink-0" />
                <span className="flex-1 text-right font-bold text-slate-800 truncate">
                  {h.name}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
