// File: frontend/src/components/ReplayControls.jsx
// Version: v0.1.2 — Fixes export to use default so RaceTrack can import cleanly

import React, { useState } from 'react';

export default function ReplayControls({ replays, onReplaySelect }) {
  const [expanded, setExpanded] = useState(false);

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const options = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${date.toLocaleTimeString('en-US', options)}`;
  };

  return (
    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-xl shadow-md z-20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded"
      >
        {expanded ? 'Hide Replays' : 'Show Replays'}
      </button>
      {expanded && (
        <ul className="mt-2 max-h-64 overflow-y-auto w-56">
          {replays.map((replay, index) => (
            <li
              key={replay.timestamp}
              className="border-b py-1 px-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => onReplaySelect(replay)}
            >
              Race #{index + 1} — {formatTimestamp(replay.timestamp)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
