// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.45 – Fix horse movement by reading sprites directly from ref

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { Color } from '@pixi/core';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

console.clear();
window.__KD_RACE_APP_VERSION__ = 'v0.7.45';
debugLog(`🔢 Frontend version: ${window.__KD_RACE_APP_VERSION__}`);
debugLog('🏁 RaceTrack component initializing');

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePositionsRef = useRef({});

  const centerX = 500;
  const centerY = 300;
  const baseRadiusX = 300;
  const baseRadiusY = 160;
  const laneSpacing = 20;

  useEffect(() => {
    debugLog('[WS] Connecting to /race via /api/socket.io...');
    socket = io('/race', {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });

    socket.on('connect', () => debugLog('[WS] ✅ Connected:', socket.id));
    socket.on('connect_error', (err) => errorLog('[WS] ❌ Connection error:', err.message));

    socket.on('race:init', (data) => {
      debugLog('[WS] 🟢 race:init received:', data);
      const initial = data.horses.map((h) => ({ ...h, pct: 0 }));
      horsePositionsRef.current = Object.fromEntries(initial.map((h) => [h.id, 0]));

      horseSpritesRef.current.forEach((sprite) => appRef.current?.stage.removeChild(sprite));
      horseSpritesRef.current.clear();

      setHorses(initial);
      setRaceStarted(true);
      setRaceFinished(false);
    });

    socket.on('race:tick', ({ horseId, pct }) => {
      horsePositionsRef.current[horseId] = pct / 100;
    });

    socket.on('race:finish', (data) => {
      debugLog('[WS] 🏁 race:finish received:', data);
      setRaceFinished(true);
    });

    return () => {
      debugLog('[WS] Disconnecting...');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) {
      debugLog('[Pixi] Skipping re-initialization');
      return;
    }

    try {
      debugLog('[Pixi] 🎨 Initializing PixiJS application...');
      const app = new Application({
        view: canvasRef.current,
        width: 1000,
        height: 600,
        backgroundColor: 0xd0f0e0,
        antialias: true,
        powerPreference: 'high-performance',
      });

      appRef.current = app;

      const track = new Graphics();
      track.lineStyle(4, 0xaaaaaa);

      for (let i = 0; i < 4; i++) {
        const padding = i * laneSpacing;
        const width = (baseRadiusX - padding) * 2;
        const height = (baseRadiusY - padding) * 2;
        const x = centerX - width / 2;
        const y = centerY - height / 2;
        const cornerRadius = 100;

        track.drawRoundedRect(x, y, width, height, cornerRadius);
        debugLog(`[Pixi] Track lane ${i + 1} drawn: x=${x}, y=${y}, w=${width}, h=${height}`);
      }

      app.stage.addChild(track);
      debugLog('[Pixi] 🏁 Track rendered with 4 rounded rectangle lanes');

      app.ticker.add(() => {
        if (!raceStarted || horseSpritesRef.current.size === 0) return;

        horseSpritesRef.current.forEach((sprite, horseId, map) => {
          const pct = horsePositionsRef.current[horseId];
          const index = [...map.keys()].indexOf(horseId);

          const angle = pct * 2 * Math.PI;
          const laneX = baseRadiusX - index * laneSpacing;
          const laneY = baseRadiusY - index * laneSpacing;
          const newX = centerX + laneX * Math.cos(angle);
          const newY = centerY + laneY * Math.sin(angle);

          sprite.x = newX;
          sprite.y = newY;
          sprite.rotation = angle + Math.PI / 2;
        });
      });
    } catch (err) {
      errorLog('[Pixi] ❌ Failed to initialize Pixi app:', err);
    }

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || horses.length === 0) return;

    horses.forEach((horse, index) => {
      if (!horseSpritesRef.current.has(horse.id)) {
        try {
          let colorHex;
          try {
            colorHex = new Color(horse.color || '#ff0000').toNumber();
          } catch (err) {
            errorLog(`[Pixi] ❌ Invalid horse color: '${horse.color}' – defaulting to red`);
            colorHex = 0xff0000;
          }

          const sprite = new Graphics();
          sprite.beginFill(colorHex);
          sprite.drawRect(-10, -10, 20, 20);
          sprite.endFill();
          sprite.x = centerX + baseRadiusX - index * laneSpacing;
          sprite.y = centerY;

          horseSpritesRef.current.set(Number(horse.id), sprite);
          app.stage.addChild(sprite);
          debugLog(`[Pixi] 🐴 Added horse sprite → ID: ${horse.id}, x=${sprite.x}, y=${sprite.y}`);
        } catch (err) {
          errorLog(`[Pixi] ❌ Failed to render horse ${horse.id}:`, err);
        }
      }
    });
  }, [horses]);

  const startTestRace = async () => {
    if (!socket?.connected) {
      debugLog('[Test] 🚫 Socket not connected');
      return;
    }

    try {
      debugLog('[Test] 📡 Fetching horses from /api/horses...');
      const res = await fetch('/api/horses');
      const horsesFromDb = await res.json();

      if (!Array.isArray(horsesFromDb) || horsesFromDb.length === 0) {
        errorLog('[Test] ❌ No horses returned from API');
        return;
      }

      const selected = horsesFromDb.slice(0, 4);
      const raceId = Date.now();
      debugLog('[Test] 🚀 Starting test race with horses:', selected);

      setRaceStarted(true);
      setRaceFinished(false);
      socket.emit('startRace', {
        raceId,
        horses: selected,
      });
    } catch (err) {
      errorLog('[Test] ❌ Failed to fetch horses:', err);
    }
  };

  return (
    <div className="p-4">
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
