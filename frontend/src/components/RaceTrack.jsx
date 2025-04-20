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

// 🏁 Initial console output
debugLog('[KD] RaceTrack Loaded – v0.4.6');
debugLog('[Pixi] PixiJS v7 modular setup active');
debugLog('[WS] Connecting to /race namespace...');
debugLog('[Pixi] No plugin registration needed in v7');

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());

  // 🌐 Setup WebSocket connection once
  useEffect(() => {
    socket = io('/race', {
      path: '/api/socket.io',
      transports: ['websocket'],
    });

    socket.on('race:init', (data) => {
      debugLog('[WS] race:init received:', data);
      const initializedHorses = data.horses.map((h, i) => ({
        ...h,
        position: 50 + i * 30,
      }));
      setHorses(initializedHorses);
      setRaceStarted(true);
    });

    socket.on('race:tick', (data) => {
      debugLog('[WS] race:tick update:', data);
      setHorses((prev) =>
        prev.map((h) =>
          h.id === data.horseId ? { ...h, position: 50 + data.pct * 9 } : h
        )
      );
    });

    socket.on('race:finish', (leaderboard) => {
      debugLog('🏁 [WS] race:finish', leaderboard);
      setRaceStarted(false);
    });

    return () => {
      debugLog('[WS] Disconnecting from race namespace...');
      socket.disconnect();
    };
  }, []);

  // 🎮 Initialize PixiJS app once
  useEffect(() => {
    if (!canvasRef.current || appRef.current) {
      debugLog('[Pixi] Skipping app init: already initialized or no canvas');
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

      // 🛣️ Draw track once
      const track = new Graphics();
      track.beginFill(0xffffff);
      track.drawRect(50, 40, 900, 220);
      track.endFill();
      app.stage.addChild(track);
      debugLog('[Pixi] Track rendered');

      // ⏱️ Ticker to update horse positions
      app.ticker.add(() => {
        horses.forEach((horse) => {
          const sprite = horseSpritesRef.current.get(horse.id);
          if (sprite) sprite.x = horse.position;
        });
      });
    } catch (err) {
      console.error('[Pixi] ❌ App init failed:', err);
    }

    return () => {
      debugLog('[Pixi] Destroying application...');
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, []); // ❗ Run only once

  // 🐎 Draw horses only when new ones arrive
  useEffect(() => {
    const app = appRef.current;
    if (!app || horses.length === 0) {
      debugLog('[Pixi] Waiting for app and horses...');
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
          debugLog(`[Pixi] Horse sprite added – ID: ${horse.id}, Color: ${horse.color}`);
        } catch (err) {
          console.error(`[Pixi] ❌ Failed to draw horse ${horse.id}:`, err);
        }
      }
    });

    debugLog(`[Pixi] ${horseSpritesRef.current.size} horse sprites now on track`);
  }, [horses]);

  // 🧪 Start test race manually
  const startTestRace = () => {
    if (!socket) {
      debugLog('[Test] Socket not initialized');
      return;
    }

    debugLog('[Test] Starting test race...');
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={startTestRace}
        >
          Start Test Race
        </button>
      </div>
    </div>
  );
};

export default RaceTrack;
