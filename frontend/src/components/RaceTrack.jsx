// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.52 – Responsive resizing and enhanced debug

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { Color } from '@pixi/core';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

window.__KD_RACE_APP_VERSION__ = 'v0.7.52';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const raceStartedRef = useRef(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePositionsRef = useRef({});

  // WebSocket setup
  useEffect(() => {
    debugLog('Initializing WebSocket...');
    socket = io('/race', { path: '/api/socket.io' });
    socket.on('connect', () => debugLog('[WS] Connected:', socket.id));

    socket.on('race:init', (data) => {
      debugLog('[WS] race:init received:', data);
      horsePositionsRef.current = Object.fromEntries(
        data.horses.map(h => [String(h.id), 0])
      );
      debugLog('Initial positions map:', horsePositionsRef.current);
      horseSpritesRef.current.forEach(s => appRef.current.stage.removeChild(s));
      horseSpritesRef.current.clear();
      setHorses(data.horses);
      raceStartedRef.current = true;
    });

    socket.on('race:tick', ({ horseId, pct }) => {
      debugLog(`[WS] race:tick → ${horseId} => ${pct}%`);
      horsePositionsRef.current[String(horseId)] = pct / 100;
    });

    socket.on('race:finish', (result) => {
      debugLog('[WS] race:finish received:', result);
      raceStartedRef.current = false;
    });

    return () => {
      debugLog('Disconnecting WebSocket...');
      socket.disconnect();
    };
  }, []);

  // Pixi init with responsive canvas
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;
    try {
      debugLog('Initializing Pixi Application...');
      const container = canvasRef.current.parentElement;
      const app = new Application({ view: canvasRef.current, backgroundColor: 0xd0f0e0, resizeTo: container });
      appRef.current = app;

      // draw track lanes
      const drawTrack = () => {
        debugLog('Drawing track...');
        const { width, height } = app.renderer;
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRX = width * 0.3;
        const baseRY = height * 0.2667;
        const laneGap = 20;
        const track = new Graphics();
        track.lineStyle(4, 0x888888);
        for (let i = 0; i < 4; i++) {
          const inset = i * laneGap;
          const w = (baseRX - inset) * 2;
          const h = (baseRY - inset) * 2;
          debugLog(`Lane ${i+1}: x=${centerX - w/2}, y=${centerY - h/2}, w=${w}, h=${h}`);
          track.drawRoundedRect(centerX - w/2, centerY - h/2, w, h, 50);
        }
        app.stage.addChild(track);
      };
      drawTrack();

      // animation loop
      debugLog('Adding ticker loop...');
      app.ticker.add(() => {
        if (!raceStartedRef.current) return;
        const { width, height } = app.renderer;
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRX = width * 0.3;
        const baseRY = height * 0.2667;
        const laneGap = 20;
        horseSpritesRef.current.forEach((sprite, id) => {
          const pct = horsePositionsRef.current[id];
          if (pct == null) return;
          const idx = sprite._idx;
          const angle = pct * 2 * Math.PI;
          const newX = centerX + (baseRX - idx*laneGap) * Math.cos(angle);
          const newY = centerY + (baseRY - idx*laneGap) * Math.sin(angle);
          sprite.x = newX;
          sprite.y = newY;
          sprite.rotation = angle + Math.PI/2;
          debugLog(`Sprite ${id} → x=${newX.toFixed(1)}, y=${newY.toFixed(1)}, angle=${angle.toFixed(2)}`);
        });
      });
    } catch (err) {
      errorLog('Pixi init failed:', err);
    }
    return () => appRef.current?.destroy(true);
  }, []);

  // spawn horse sprites once per init
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    horses.forEach((h, idx) => {
      const key = String(h.id);
      if (horseSpritesRef.current.has(key)) return;
      const colorNum = new Color(h.color || '#ff0000').toNumber();
      const sprite = new Graphics()
        .beginFill(colorNum)
        .drawCircle(0, 0, 12)
        .endFill();
      sprite._idx = idx;
      horseSpritesRef.current.set(key, sprite);
      app.stage.addChild(sprite);
      debugLog(`Added sprite for horse ${key} at index ${idx}`);
    });
  }, [horses]);

  const startTestRace = async () => {
    debugLog('startTestRace invoked');
    if (!socket || socket.disconnected) return;
    const res = await fetch('/api/horses');
    const list = await res.json();
    debugLog('Horses fetched:', list.slice(0, 4));
    socket.emit('startRace', { raceId: Date.now(), horses: list.slice(0, 4) });
  };

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-96" />
      <button onClick={startTestRace} className="mt-4 bg-blue-600 px-4 py-2 text-white rounded">
        Start Test Race
      </button>
    </div>
  );
};

export default RaceTrack;
