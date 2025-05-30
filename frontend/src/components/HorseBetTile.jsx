// File: frontend/src/components/HorseBetTile.jsx
// Version: v1.1.1 — Uses horse.saddleHex explicitly for color styling
// Date: 2025-05-29

import React from 'react';

export default function HorseBetTile({ horse, bet, onChange, disabled, maxIncrement }) {
  const increment = 50;

  function dec() {
    if (disabled) return;
    const newBet = Math.max(0, bet - increment);
    onChange(horse.id, newBet);
  }

  function inc() {
    if (disabled) return;
    const newBet = bet + increment;
    if (maxIncrement !== undefined && newBet > maxIncrement) return;
    onChange(horse.id, newBet);
  }

  const hex = horse.saddleHex || '#999999';

  return (
    <div
      className="border rounded-xl p-4 w-full max-w-md flex flex-col items-center space-y-3 shadow"
      style={{
        backgroundColor: `${hex}20`, // Translucent background
        borderColor: hex
      }}
    >
      <div className="flex items-center space-x-2 text-lg font-semibold">
        <span className="text-2xl">🐎</span>
        <span
          className="rounded-full w-4 h-4 inline-block"
          style={{ backgroundColor: hex }}
        ></span>
        <span style={{ color: hex }}>{horse.name}</span>
      </div>

      <div className="text-xl font-bold text-gray-900">
        Bet: {bet} Lease Loons
      </div>

      <div className="flex space-x-4">
        <button
          onClick={dec}
          disabled={disabled || bet === 0}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          type="button"
        >
          -50
        </button>
        <button
          onClick={inc}
          disabled={disabled || (maxIncrement !== undefined && bet + increment > maxIncrement)}
          className="px-4 py-2 text-white rounded disabled:opacity-50"
          type="button"
          style={{ backgroundColor: hex }}
        >
          +50
        </button>
      </div>
    </div>
  );
}
