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
        <h1 className="text-3xl font-bold text-center mb-2">🏇 Welcome to the KD Race App</h1>
        <p className="text-lg text-center mb-6">Let the races begin!</p>
      </div>

      {/* Race Track */}
      <RaceTrack />
    </div>
  );
}

export default App;
