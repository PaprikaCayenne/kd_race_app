// File: frontend/src/App.jsx
// Version: v0.5.0 — Uses RaceTrack.VERSION directly instead of global injection

import React from 'react';
import RaceTrack from './components/RaceTrack';

function App() {
  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="relative">
        {/* Top-right version info */}
        <div className="absolute top-2 right-4 text-right text-xs">
          <div className="text-green-600">Loaded: {RaceTrack.VERSION}</div>
        </div>
        {/* App Title */}
      </div>

      {/* Race Track */}
      <RaceTrack />
    </div>
  );
}

export default App;
