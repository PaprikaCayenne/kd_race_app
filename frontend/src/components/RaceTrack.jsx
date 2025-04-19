import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import io from 'socket.io-client';

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);

  useEffect(() => {
    const socket = io('http://192.168.50.212:4000'); // Update to your backend WebSocket URL
    
    socket.on('race:init', (data) => {
      setHorses(data.horses); // Initialize horses
      setRaceStarted(true);
    });

    socket.on('race:tick', (data) => {
      setHorses(prevHorses =>
        prevHorses.map(horse => horse.id === data.horseId 
          ? { ...horse, position: data.position } 
          : horse
        )
      );
    });

    socket.on('race:finish', (leaderboard) => {
      console.log('Race finished!', leaderboard);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const app = new PIXI.Application({
        view: canvasRef.current,
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb
      });

      // Add race track (you can customize this later)
      const track = new PIXI.Graphics();
      track.beginFill(0xFFFFFF);
      track.drawRect(50, 100, 700, 20); // Track dimensions
      track.endFill();
      app.stage.addChild(track);  // Add the track to the PixiJS stage

      // Ensure we have horses before adding them to the stage
      if (horses.length > 0) {
        horses.forEach((horse) => {
          const horseSprite = new PIXI.Graphics();
          horseSprite.beginFill(horse.color || 0xFF0000); // Default to red if no color
          horseSprite.drawRect(0, 0, 30, 10); // Horse size
          horseSprite.endFill();
          horseSprite.position.set(horse.position || 50, 100); // Default start position
          app.stage.addChild(horseSprite); // Add horse to stage
        });
      }

      // Start animation loop
      app.ticker.add(() => {
        if (raceStarted) {
          horses.forEach((horse, index) => {
            const horseSprite = app.stage.children[index + 1]; // Offset by 1 since track is the first child
            if (horseSprite) {
              horseSprite.x += 1; // Move horses forward on the track
            }
          });
        }
      });
    }

    return () => {
      // Cleanup PixiJS on unmount
    };
  }, [horses, raceStarted]);

  return (
    <div>
      <h2 className="text-xl font-bold">Race Track</h2>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RaceTrack;
