// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.5.0 — Narrow race panel with larger sprites and optional drag handle
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
      className="absolute bg-slate-100/95 border border-slate-300 p-3 rounded-2xl shadow-2xl z-50 animate-fadeIn"
      style={panelStyle}
    >
      <div
        className={`flex items-center justify-between mb-2 ${draggable ? 'cursor-move select-none' : ''}`}
        onMouseDown={draggable ? onDragStart : undefined}
      >
        <h2 className="text-lg font-black text-slate-800 truncate">{raceName}</h2>
        {draggable && <span className="text-[10px] text-slate-500 uppercase tracking-wide">Drag</span>}
      </div>

      <ol className="space-y-2 text-sm">
        {ranking.map((h, i) => {
          const badgeColor = h.saddleHex
            ? { backgroundColor: h.saddleHex }
            : { backgroundColor: '#888' };

          return (
            <li
              key={h.id}
              className="flex items-center px-2 py-2 bg-white rounded-lg shadow-sm gap-2"
            >
              <span
                className="text-white text-xs font-bold px-2 py-1 rounded-full shrink-0"
                style={badgeColor}
              >
                {i + 1}
              </span>
              <HorseSprite bodyHex={h.bodyHex} saddleHex={h.saddleHex} alt={h.name} className="w-10 h-10 shrink-0" />
              <span className="flex-1 text-right font-semibold text-slate-800 truncate">
                {h.name}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
