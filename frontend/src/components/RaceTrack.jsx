// File: frontend/src/components/RaceTrack.jsx

import React, { useEffect, useRef, useState } from 'react';

// ✅ Modular PixiJS v7.4.3 imports
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { TickerPlugin } from '@pixi/ticker';
import { Renderer } from '@pixi/core';
import '@pixi/display';

import io from 'socket.io-client';

// 🐛 Toggle debug logging
const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);

// 📦 Log package versions
debugLog('[KD] RaceTrack Loaded – v0.4.9');
debugLog('[Pixi] PixiJS v7.4.3');
debugLog('[Socket.IO] Client:', io?.version ?? 'unknown');

// 🌐 Socket.IO reference
let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());

  // 🌐 WebSocket setup
  useEffect(() => {
    debugLog('[WS] Connecting to /race via /api/socket.io...');
    socket = io('/race', {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    socket.on('connect', () => {
      debugLog('[WS] ✅ Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      debugLog('[WS] ❌ Connection error:', err.message);
    });

    socket.on('race:init', (data) => {
      debugLog('[WS] race:init received:', data);
      const initializedHorses = data.horses.map((h, i) => ({
        ...h,
        position: 50 + i * 30,
      }));
      setHorses(initializedHorses);
      setRaceStarted(true);
      setRaceFinished(false);
    });

    socket.on('race:tick', (data) => {
      if (raceFinished) return;
      debugLog('[WS] race:tick update:', data);
      setHorses((prev) =>
        prev.map((h) =>
          h.id === data.horseId ? { ...h, position: 50 + data.pct * 9 } : h
        )
      );
    });

    socket.on('race:finish', (leaderboard) => {
      debugLog('🏁 [WS] race:finish', leaderboard);
      setRaceFinished(true);
      setRaceStarted(false);
    });

    return () => {
      debugLog('[WS] Disconnecting from race namespace...');
      socket.disconnect();
    };
  }, [raceFinished]);

  // 🎮 Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current || appRef.current) {
      debugLog('[Pixi] Skipping init – already running or missing canvas');
      return;
    }

    try {
      debugLog('[Pixi] Creating new Application...');
      const app = new Application({
        view: canvasRef.current,
        width: 1000,
        height: 300,
        backgroundColor: 0xd0f0e0,
        antialias: true,
      });

      appRef.current = app;
      debugLog('[Pixi] App created:', app);

      const track = new Graphics();
      track.beginFill(0xffffff);
      track.drawRect(50, 40, 900, 220);
      track.endFill();
      app.stage.addChild(track);
      debugLog('[Pixi] Track rendered');

      app.ticker.add(() => {
        horses.forEach((horse) => {
          const sprite = horseSpritesRef.current.get(horse.id);
          if (sprite) sprite.x = horse.position;
        });
      });
    } catch (err) {
      console.error('[Pixi] ❌ Initialization failed:', err);
    }

    return () => {
      debugLog('[Pixi] Destroying application...');
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, []);

  // 🐎 Render horses
  useEffect(() => {
    const app = appRef.current;
    if (!app || horses.length === 0) {
      debugLog('[Pixi] Waiting on app or horses...');
      return;
    }

    horses.forEach((horse, index) => {
      if (!horseSpritesRef.current.has(horse.id)) {
        try {
          const color = parseInt((horse.color || '#ff0000').replace('#', ''), 16);
          const sprite = new Graphics();
          sprite.beginFill(color);
          sprite.drawRect(0, 0, 40, 20);
          sprite.endFill();
          sprite.x = horse.position || 50;
          sprite.y = 60 + index * 40;

          horseSpritesRef.current.set(horse.id, sprite);
          app.stage.addChild(sprite);
          debugLog(`[Pixi] 🐴 Added horse – ID: ${horse.id}, Color: ${horse.color}`);
        } catch (err) {
          console.error(`[Pixi] ❌ Failed to render horse ${horse.id}:`, err);
        }
      }
    });

    debugLog(`[Pixi] 🐎 Total sprites: ${horseSpritesRef.current.size}`);
  }, [horses]);

  // 🧪 Start race
  const startTestRace = () => {
    if (!socket?.connected) {
      debugLog('[Test] 🚫 Socket not connected');
      return;
    }

    debugLog('[Test] 🔁 Starting test race');
    setRaceFinished(false);
    socket.emit('startRace', {
      raceId: Date.now(),
      horses: [
        { id: 1, color: '#ff0000' },
        { id: 2, color: '#00ff00' },
        { id: 3, color: '#0000ff' },
      ],
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Race Track</h2>
      <canvas ref={canvasRef} />
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={startTestRace}
        >
          Start Test Race
        </button>
      </div>
    </div>
  );
};

export default RaceTrack;
