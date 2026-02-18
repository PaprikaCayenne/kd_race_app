// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.4.0 — Uses external bounds style and compact race panel sizing
// Date: 2026-02-18

import React from 'react';

function buildHorseIcon(bodyHex = '#a0522d', saddleHex = '#888888') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${bodyHex}"/><circle cx="47" cy="28" r="9" fill="${bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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
              <img
                src={buildHorseIcon(h.bodyHex, h.saddleHex)}
                alt={h.name}
                className="w-7 h-7 shrink-0"
              />
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
