import React from 'react';
import RaceTrack from './components/RaceTrack'; // Import the RaceTrack component

function App() {
  return (
    <div className="min-h-screen bg-green-50 p-4">
      <h1 className="text-3xl font-bold text-center mb-4">🏇 Welcome to the KD Race App</h1>
      <p className="text-lg text-center mb-8">Let the races begin!</p>

      {/* Add RaceTrack component here */}
      <RaceTrack />
    </div>
  );
}

export default App;
