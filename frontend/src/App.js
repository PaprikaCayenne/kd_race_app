import React from 'react';
import RaceTrack from './RaceTrack'; // Import RaceTrack component

// The App component displays the race and other UI elements
function App() {
  return (
    <div className="App">
      <h1>Race Game</h1>
      <RaceTrack />  {/* Render the RaceTrack component with the race animation */}
    </div>
  );
}

export default App;
