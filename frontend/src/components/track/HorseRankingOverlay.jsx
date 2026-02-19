// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.4.0 — Uses external bounds style and compact race panel sizing
// Date: 2026-02-18

import React from 'react';
import HorseSprite from '../HorseSprite';

export default function HorseRankingOverlay({ ranking, raceName = '🏇 Live Standings 🏇', panelStyle = undefined }) {
  return (
    <div className="absolute bg-white/95 p-4 rounded-2xl shadow-2xl z-50 animate-fadeIn" style={panelStyle}>
      <h2 className="text-2xl font-extrabold text-center text-red-700 mb-3 border-b pb-2 border-red-200 truncate">
        {raceName}
      </h2>
      <ol className="space-y-2 text-sm">
        {ranking.map((h, i) => {
          const badgeColor = h.saddleHex
            ? { backgroundColor: h.saddleHex }
            : { backgroundColor: '#888' };

          return (
            <li
              key={h.id}
              className="flex items-center px-2 py-2 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition gap-2"
            >
              <span
                className="text-white text-xs font-bold px-2 py-1 rounded-full shrink-0"
                style={badgeColor}
              >
                {i + 1}
              </span>
              <HorseSprite bodyHex={h.bodyHex} saddleHex={h.saddleHex} alt={h.name} className="w-7 h-7 shrink-0" />
              <span className="flex-1 text-right font-medium text-gray-800 truncate">
                {h.name}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
