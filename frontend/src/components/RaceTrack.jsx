// File: frontend/src/components/RaceTrack.jsx

import React, { useEffect, useRef, useState } from 'react';

// ✅ Modular Pixi imports (v8 style)
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { TickerPlugin } from '@pixi/ticker';
import { Renderer } from '@pixi/core';
import { VERSION } from '@pixi/constants';
import '@pixi/display'; // required for `stage.addChild`

import io from 'socket.io-client';

// 🐛 Toggle debug logs
const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log(...args);

debugLog('[KD] RaceTrack Loaded – v0.4.1');
debugLog('[Pixi] Version:', VERSION);
debugLog('[WS] Connecting...');

// 📦 Register plugins
Application.registerPlugin(TickerPlugin);
Application.registerPlugin(Renderer);

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceStarted, setRaceStarted] = useState(false);

  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());

  // 🌐 WebSocket connection to race namespace
  useEffect(() => {
    const socket = io('/race', { path: '/socket.io' });

    socket.on('race:init', (data) => {
      debugLog('[WS] race:init', data);
      const initializedHorses = data.horses.map((h, index) => ({
        ...h,
        position: 50 + index * 30,
      }));
      setHorses(initializedHorses);
      setRaceStarted(true);
    });

    socket.on('race:tick', (data) => {
      debugLog('[WS] race:tick', data);
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

    return () => socket.disconnect();
  }, []);

  // 🎮 Initialize PixiJS app
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    debugLog('[Pixi] Canvas ref ready?', !!canvasRef.current);
    debugLog('[Pixi] Creating Application...');

    try {
      const app = new Application({
        view: canvasRef.current,
        width: 1000,
        height: 300,
        backgroundColor: 0xd0f0e0,
        antialias: true,
      });

      appRef.current = app;
      debugLog('[Pixi] Application created:', app);

      const track = new Graphics();
      track.rect(50, 40, 900, 220).fill(0xffffff);
      app.stage.addChild(track);
      debugLog('[Pixi] Track drawn');

      let frame = 0;
      app.ticker.add(() => {
        horses.forEach((horse) => {
          const sprite = horseSpritesRef.current.get(horse.id);
          if (sprite) sprite.x = horse.position;
        });

        if (++frame % 20 === 0) {
          debugLog(`[Pixi] Ticker frame ${frame}`);
        }
      });
    } catch (err) {
      console.error('[Pixi] Failed to create Application:', err);
    }

    return () => {
      if (appRef.current) {
        debugLog('[Pixi] Destroying app...');
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      horseSpritesRef.current.clear();
    };
  }, [horses]);

  // 🐎 Add horses when race starts
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
        debugLog(`[Pixi] Added horse – ID: ${horse.id}, Color: ${horse.color}`);
      }
    });

    debugLog(`[Pixi] Total horses on track: ${horseSpritesRef.current.size}`);
  }, [horses]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Race Track</h2>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default RaceTrack;
