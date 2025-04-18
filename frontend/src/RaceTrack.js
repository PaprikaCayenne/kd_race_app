import React, { useEffect, useState } from 'react';
import * as PIXI from 'pixi.js';
import { io } from 'socket.io-client';

const RaceTrack = () => {
  const [raceData, setRaceData] = useState([]);

  useEffect(() => {
    // Create PixiJS app
    const app = new PIXI.Application({
      width: 800,
      height: 400,
      backgroundColor: 0x1099bb,
    });
    document.getElementById('race-track').appendChild(app.view);

    // Create a simple race track (rectangle)
    const track = new PIXI.Graphics();
    track.beginFill(0x333333);
    track.drawRect(0, 150, 800, 100);  // Position and size of the track
    track.endFill();
    app.stage.addChild(track);

    // Set up WebSocket connection
    const socket = io('http://localhost:4000/race'); // Adjust to your backend URL

    // Listen for the initial race data
    socket.on('race:init', (data) => {
      setRaceData(data.horses);  // Store horse data in state
    });

    // Listen for race progress updates
    socket.on('race:tick', (data) => {
      setRaceData((prevData) =>
        prevData.map((horse, idx) => ({
          ...horse,
          x: (horse.x + data.horses[idx].pct * 8) % 800,  // Update horse position
        }))
      );
    });

    // Create horses (colored rectangles for now)
    const horses = [];
    const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];  // Colors for horses
    const horseWidth = 40;
    const horseHeight = 30;

    for (let i = 0; i < 4; i++) {
      const horse = new PIXI.Graphics();
      horse.beginFill(colors[i]);
      horse.drawRect(0, 0, horseWidth, horseHeight);  // Draw horse as rectangle
      horse.endFill();
      horse.x = 0;
      horse.y = 150 + i * 35;  // Offset horses vertically
      app.stage.addChild(horse);
      horses.push(horse);
    }

    return () => {
      app.destroy(true, { children: true });  // Clean up when the component unmounts
    };
  }, []);

  return <div id="race-track"></div>;
};

export default RaceTrack;
