// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.18 – Sync with race.js tick %, improved logging, final stable motion

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

const PIXI_VERSION = '7.4.3';
debugLog(`[KD] RaceTrack Loaded – v0.7.18`);
debugLog(`[PixiJS] Version: ${PIXI_VERSION}`);
debugLog(`[Socket.IO] Version:`, typeof io?.Manager === 'function' ? io()?.io?.engine?.version ?? 'not available' : 'unavailable');

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
      debugLog('[WS] race:init received:', data);
      const initial = data.horses.map((h) => ({ ...h, pct: 0 }));
      horsePositionsRef.current = Object.fromEntries(initial.map((h) => [h.id, 0]));
      setHorses(initial);
      setRaceStarted(true);
      setRaceFinished(false);
    });

    socket.on('race:tick', ({ horseId, pct }) => {
      horsePositionsRef.current[horseId] = pct / 100;
    });

    return () => {
      debugLog('[WS] Disconnecting...');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (appRef.current) {
      debugLog('[Pixi] Destroying previous application before re-initializing');
      appRef.current.destroy(true, { children: true });
      appRef.current = null;
      horseSpritesRef.current.clear();
    }

    try {
      debugLog('[Pixi] Initializing application...');
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
        const radiusX = baseRadiusX + i * laneSpacing;
        const radiusY = baseRadiusY + i * laneSpacing;
        track.drawEllipse(centerX, centerY, radiusX, radiusY);
      }
      app.stage.addChild(track);
      debugLog('[Pixi] Track rendered with 4 lanes');

      app.ticker.add(() => {
        for (const [horseId, pct] of Object.entries(horsePositionsRef.current)) {
          const sprite = horseSpritesRef.current.get(parseInt(horseId));
          const index = horses.findIndex((h) => h.id === parseInt(horseId));
          if (!sprite || index === -1) continue;

          const angle = pct * 2 * Math.PI;
          const laneX = baseRadiusX + index * laneSpacing;
          const laneY = baseRadiusY + index * laneSpacing;

          sprite.x = centerX + laneX * Math.cos(angle);
          sprite.y = centerY + laneY * Math.sin(angle);
          sprite.rotation = angle + Math.PI / 2;
        }
      });
    } catch (err) {
      errorLog('[Pixi] ❌ Failed to initialize:', err);
    }

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, [horses]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || horses.length === 0) return;

    horses.forEach((horse, index) => {
      if (!horseSpritesRef.current.has(horse.id)) {
        try {
          const color = parseInt((horse.color || '#ff0000').replace('#', ''), 16);
          const sprite = new Graphics();
          sprite.beginFill(color);
          sprite.drawRect(-10, -10, 20, 20);
          sprite.endFill();
          sprite.x = centerX + baseRadiusX + index * laneSpacing;
          sprite.y = centerY;

          horseSpritesRef.current.set(horse.id, sprite);
          app.stage.addChild(sprite);
          debugLog(`[Pixi] 🐴 Added horse – ID: ${horse.id}, Name: ${horse.name}, DB Color: ${horse.color}, Hex: #${color.toString(16).padStart(6, '0')}`);
        } catch (err) {
          errorLog(`[Pixi] Failed to render horse ${horse.id}:`, err);
        }
      }
    });

    debugLog(`[Pixi] 🐎 Total horses rendered: ${horseSpritesRef.current.size}`);
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
      <h2 className="text-xl font-bold mb-2">🏇 KD Oval Race Track</h2>
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
