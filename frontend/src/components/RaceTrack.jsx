// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.17 – Fix duplicate Pixi app crash, ensure movement, proper destroy, better Socket.IO version detection

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

// 🌱 Version and environment info
const PIXI_VERSION = '7.4.3';
debugLog(`[KD] RaceTrack Loaded – v0.7.17`);
debugLog(`[PixiJS] Version: ${PIXI_VERSION}`);
debugLog(`[Socket.IO] Version:`, typeof io?.Manager === 'function' ? io()?.io?.engine?.version ?? 'not available' : 'unavailable');

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  const [currentRaceId, setCurrentRaceId] = useState(null);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePositionsRef = useRef({});
  const horseVelocitiesRef = useRef({});
  const finishedHorsesRef = useRef(new Set());

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
      horseVelocitiesRef.current = Object.fromEntries(initial.map((h) => [h.id, 0.0025 + Math.random() * 0.0015]));
      finishedHorsesRef.current.clear();
      setCurrentRaceId(data.raceId);
      setHorses(initial);
      setRaceStarted(true);
      setRaceFinished(false);
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
        track.drawRoundedRect(centerX - radiusX, centerY - radiusY, radiusX * 2, radiusY * 2, 50);
      }
      app.stage.addChild(track);
      debugLog('[Pixi] Track rendered with 4 lanes');

      app.ticker.add(() => {
        for (const [horseId, pct] of Object.entries(horsePositionsRef.current)) {
          const sprite = horseSpritesRef.current.get(parseInt(horseId));
          const index = horses.findIndex((h) => h.id === parseInt(horseId));
          if (!sprite || index === -1) continue;

          const velocity = horseVelocitiesRef.current[horseId] || 0.003;
          if (pct < 1) {
            horsePositionsRef.current[horseId] = Math.min(pct + velocity, 1);

            if (horsePositionsRef.current[horseId] >= 1 && !finishedHorsesRef.current.has(horseId)) {
              finishedHorsesRef.current.add(horseId);
              debugLog(`[Race] Horse ${horseId} finished`);
            }
          }

          const angle = horsePositionsRef.current[horseId] * 2 * Math.PI;
          const laneX = baseRadiusX + index * laneSpacing;
          const laneY = baseRadiusY + index * laneSpacing;

          sprite.x = centerX + laneX * Math.cos(angle);
          sprite.y = centerY + laneY * Math.sin(angle);
          sprite.rotation = angle + Math.PI / 2;
        }

        if (raceStarted && finishedHorsesRef.current.size === horses.length) {
          debugLog('[Race] All horses finished – emitting race:finish');
          const leaderboard = horses.map((h, i) => ({
            horseId: h.id,
            position: i + 1,
            timeMs: 3000 + i * 250,
          }));
          socket.emit('race:finish', { raceId: currentRaceId, leaderboard });
          setRaceStarted(false);
          setRaceFinished(true);
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
      setCurrentRaceId(raceId);
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
