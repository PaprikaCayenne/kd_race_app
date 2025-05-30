// File: frontend/src/components/track/HorseRankingOverlay.jsx
// Version: v2.2.0 — Shows race name in title instead of "Live Standings"
// Date: 2025-05-30

import React from 'react';

export default function HorseRankingOverlay({ ranking, raceName = "🏇 Live Standings 🏇" }) {
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
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition"
            >
              <span
                className="text-white text-sm font-bold px-3 py-1 rounded-full"
                style={badgeColor}
              >
                {i + 1}
              </span>
              <span className="ml-2 flex-1 text-right font-medium text-gray-800 truncate">
                {h.name}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
