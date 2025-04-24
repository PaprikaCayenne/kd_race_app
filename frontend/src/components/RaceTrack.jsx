// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.58 – Increased spacing, edge safety & smoothing

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { Color } from '@pixi/core';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

window.__KD_RACE_APP_VERSION__ = 'v0.7.58';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePositionsRef = useRef({});

  // WebSocket setup
  useEffect(() => {
    debugLog('WebSocket initializing...');
    socket = io('/race', { path: '/api/socket.io' });
    socket.on('connect', () => debugLog('[WS] Connected:', socket.id));

    socket.on('race:init', data => {
      debugLog('[WS] race:init', data);
      // start all evenly spaced on finish line
      horsePositionsRef.current = Object.fromEntries(
        data.horses.map((h, i) => [h.id, -i * 0.02])
      );
      horseSpritesRef.current.forEach(s => appRef.current.stage.removeChild(s));
      horseSpritesRef.current.clear();
      setHorses(data.horses);
    });

    socket.on('race:tick', ({ horseId, pct }) => {
      horsePositionsRef.current[horseId] = pct / 100;
    });

    return () => socket.disconnect();
  }, []);

  // Pixi init & track draw
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;
    try {
      const container = canvasRef.current.parentElement;
      const app = new Application({
        view: canvasRef.current,
        backgroundColor: 0xd0f0e0,
        resizeTo: container,
      });
      appRef.current = app;

      const drawTrack = () => {
        const { width, height } = app.renderer;
        const cx = width / 2;
        const cy = height / 2;
        const baseRX = width * 0.45;
        const baseRY = height * 0.32;
        const outerGap = 40;
        // fixed boundary inset so spacing remains perfect
        const boundaryInset = 4 * 25 + 10;
        const track = new Graphics();

        // Outer border
        track.lineStyle(5, 0x333333);
        track.drawRoundedRect(
          cx - (baseRX + outerGap),
          cy - (baseRY + outerGap),
          (baseRX + outerGap) * 2,
          (baseRY + outerGap) * 2,
          100
        );

        // Inner border
        track.lineStyle(5, 0x333333);
        track.drawRoundedRect(
          cx - (baseRX - boundaryInset),
          cy - (baseRY - boundaryInset),
          (baseRX - boundaryInset) * 2,
          (baseRY - boundaryInset) * 2,
          100
        );

        app.stage.addChild(track);
      };
      drawTrack();

      // Movement loop with smoothing & edge safety
      app.ticker.add(delta => {
        const { width, height } = app.renderer;
        const cx = width / 2;
        const cy = height / 2;
        const baseRX = width * 0.45;
        const baseRY = height * 0.32;
        const laneGap = 25; // radial lane spacing
        const spriteRadius = 12;

        horseSpritesRef.current.forEach((sprite, id) => {
          const rawPct = horsePositionsRef.current[id] || 0;
          const pct = Math.min(Math.max(rawPct, 0), 1);
          const targetAngle = pct * 2 * Math.PI;
          // smoothing current angle
          if (sprite._currentAngle == null) sprite._currentAngle = targetAngle;
          sprite._currentAngle += (targetAngle - sprite._currentAngle) * 0.05 * delta;
          const angle = sprite._currentAngle;

          // radial position per lane
          const idx = sprite._idx;
          const rX = baseRX - idx * laneGap;
          const rY = baseRY - idx * laneGap;
          // ensure edges stay inside boundaries
          const effRX = rX - spriteRadius;
          const effRY = rY - spriteRadius;

          sprite.x = cx + effRX * Math.cos(angle);
          sprite.y = cy + effRY * Math.sin(angle);
          sprite.rotation = angle + Math.PI / 2;
        });
      });
    } catch (e) {
      errorLog('Pixi init error:', e);
    }
    return () => appRef.current?.destroy(true);
  }, []);

  // Create sprites
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    horses.forEach((horse, idx) => {
      const key = horse.id;
      if (horseSpritesRef.current.has(key)) return;
      const colorNum = new Color(horse.color || '#ff0000').toNumber();
      const sprite = new Graphics()
        .beginFill(colorNum)
        .drawCircle(0, 0, 12)
        .endFill();
      sprite._idx = idx;
      horseSpritesRef.current.set(key, sprite);
      app.stage.addChild(sprite);
      debugLog(`Sprite ${key} created.`);
    });
  }, [horses]);

  const startTestRace = async () => {
    debugLog('startTestRace');
    if (!socket || socket.disconnected) return;
    const res = await fetch('/api/horses');
    const list = await res.json();
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
