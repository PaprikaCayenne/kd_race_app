// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.3.0 — Shows horse icon and keeps live order aligned with track progress
// Date: 2026-02-18

import React from 'react';

function buildHorseIcon(bodyHex = '#a0522d', saddleHex = '#888888') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${bodyHex}"/><circle cx="47" cy="28" r="9" fill="${bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function HorseRankingOverlay({ ranking, raceName = '🏇 Live Standings 🏇' }) {
  return (
    <div className="absolute top-60 right-[225px] w-80 bg-white bg-opacity-95 p-6 rounded-2xl shadow-2xl z-50 animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-center text-red-700 mb-4 border-b pb-2 border-red-200">
        {raceName}
      </h2>
      <ol className="space-y-3 text-base">
        {ranking.map((h, i) => {
          const badgeColor = h.saddleHex
            ? { backgroundColor: h.saddleHex }
            : { backgroundColor: '#888' };

          return (
            <li
              key={h.id}
              className="flex items-center px-3 py-2 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition gap-2"
            >
              <span
                className="text-white text-sm font-bold px-3 py-1 rounded-full"
                style={badgeColor}
              >
                {i + 1}
              </span>
              <img
                src={buildHorseIcon(h.bodyHex, h.saddleHex)}
                alt={h.name}
                className="w-8 h-8 shrink-0"
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
