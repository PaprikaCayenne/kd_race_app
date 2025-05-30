// File: frontend/src/App.jsx
// Version: v0.6.3 — Removes version and race name display from top-right

import React, { useState } from 'react';
import RaceTrack from './components/RaceTrack';

function App() {
  const [raceName, setRaceName] = useState(null);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#baf0ba]">
      {/* Race Track */}
      <RaceTrack setRaceName={setRaceName} />
    </div>
  );
}

export default App;
