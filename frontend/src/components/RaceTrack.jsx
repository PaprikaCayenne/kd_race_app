// File: frontend/src/components/RaceTrack.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics, VERSION } from 'pixi.js';
import io from 'socket.io-client';

console.log('[KD] RaceTrack Loaded – v0.3.5');
console.log('[Pixi] Version:', VERSION);
console.log('[WS] Connecting...');

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());

  // 🌐 Connect to WebSocket
  useEffect(() => {
    const socket = io('/', {
      path: '/api/socket.io',
    });

    socket.on('race:init', (data) => {
      console.log('[WS] race:init', data);
      const initializedHorses = data.horses.map((h, index) => ({
        ...h,
        position: 50 + index * 30,
      }));
      setHorses(initializedHorses);
      setRaceStarted(true);
    });

    socket.on('race:tick', (data) => {
      setHorses(prev =>
        prev.map(h =>
          h.id === data.horseId ? { ...h, position: 50 + data.pct * 9 } : h
        )
      );
    });

    socket.on('race:finish', (leaderboard) => {
      console.log('🏁 Race complete!', leaderboard);
      setRaceStarted(false);
    });

    return () => socket.disconnect();
  }, []);

  // 🎮 Create PixiJS app once
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    console.log('[Pixi] Creating app...');
    Application.init({
      view: canvasRef.current,
      width: 1000,
      height: 300,
      backgroundColor: 0xd0f0e0,
      antialias: true,
    }).then((app) => {
      appRef.current = app;

      // Draw track
      const track = new Graphics();
      track.rect(50, 40, 900, 220).fill(0xffffff);
      app.stage.addChild(track);

      // Animate horses
      app.ticker.add(() => {
        horses.forEach((horse) => {
          const sprite = horseSpritesRef.current.get(horse.id);
          if (sprite) {
            sprite.x = horse.position;
          }
        });
      });
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, [horses]);

  // 🐎 Add horse rectangles
  useEffect(() => {
    const app = appRef.current;
    if (!app || horses.length === 0) return;

    horses.forEach((horse, index) => {
      if (!horseSpritesRef.current.has(horse.id)) {
        const color = parseInt((horse.color || '#ff0000').replace('#', ''), 16);

        const sprite = new Graphics();
        sprite.rect(0, 0, 40, 20).fill(color);
        sprite.x = horse.position || 50;
        sprite.y = 60 + index * 40;

        horseSpritesRef.current.set(horse.id, sprite);
        app.stage.addChild(sprite);
      }
    });
  }, [horses]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Race Track</h2>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RaceTrack;
