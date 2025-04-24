// File: frontend/src/components/RaceTrack.jsx
// Version: v0.8.14 – Restore full race logic and live PixiJS rendering

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { Color } from '@pixi/core';
import '@pixi/display';
import io from 'socket.io-client';
import { generateOvalPath } from '../../../api/utils/generateOvalPath.js';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

window.__KD_RACE_APP_VERSION__ = 'v0.8.14';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

let socket;

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const [horses, setHorses] = useState([]);
  const [raceMode, setRaceMode] = useState('live');
  const [pastRaces, setPastRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePositionsRef = useRef({});
  const horsePathsRef = useRef({});
  const frameCounterRef = useRef(0);
  const finishedRef = useRef(false);

  const replayFramesRef = useRef([]);
  const replayIndexRef = useRef(0);
  const trackGraphicRef = useRef(null);

  useEffect(() => {
    debugLog('WebSocket initializing...');
    socket = io('/race', { path: '/api/socket.io' });
    socket.on('connect', () => debugLog('[WS] Connected:', socket.id));

    socket.on('race:init', data => {
      debugLog('[WS] race:init', data);
      finishedRef.current = false;
      replayFramesRef.current = [];
      replayIndexRef.current = 0;
      horsePathsRef.current = data.horsePaths || {};
      debugLog('🧭 All Horse Paths:', horsePathsRef.current);

      setRaceMode('live');
      horsePositionsRef.current = Object.fromEntries(
        data.horses.map(h => [h.id, 0])
      );
      const app = appRef.current;
      if (app?.stage) {
        horseSpritesRef.current.forEach(s => {
          try { app.stage.removeChild(s); } catch {}
        });
        if (trackGraphicRef.current) {
          try { app.stage.removeChild(trackGraphicRef.current); } catch {}
        }
      }
      horseSpritesRef.current.clear();
      setHorses(data.horses);

      const examplePath = data.horsePaths?.[data.horses[0]?.id];
      if (app && examplePath?.length > 1) {
        const track = new Graphics();
        track.lineStyle(5, 0x555555);
        track.moveTo(examplePath[0][0], examplePath[0][1]);
        for (let i = 1; i < examplePath.length; i++) {
          track.lineTo(examplePath[i][0], examplePath[i][1]);
        }
        trackGraphicRef.current = track;
        app.stage.addChild(track);
      }
    });

    socket.on('race:tick', tick => {
      if (raceMode === 'live') {
        horsePositionsRef.current[tick.horseId] = tick.pct / 100;
        replayFramesRef.current.push(tick);
      }
    });

    return () => socket.disconnect();
  }, [raceMode]);

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

      const basePath = generateOvalPath(500, 350, 300, 200, 200, 400);
      const track = new Graphics();
      track.lineStyle(5, 0x999999);
      track.moveTo(basePath[0].x, basePath[0].y);
      for (let i = 1; i < basePath.length; i++) {
        track.lineTo(basePath[i].x, basePath[i].y);
      }
      trackGraphicRef.current = track;
      app.stage.addChild(track);
      debugLog(`📏 Generated track drawn on page load. Points: ${basePath.length}`);

      app.ticker.add(() => {
        const frameCounter = ++frameCounterRef.current;
        let allFinished = true;

        if (raceMode === 'replay') {
          if (replayIndexRef.current < replayFramesRef.current.length) {
            const tick = replayFramesRef.current[replayIndexRef.current++];
            horsePositionsRef.current[tick.horseId] = tick.pct / 100;
          }
        }

        horseSpritesRef.current.forEach((sprite, id) => {
          const rawPct = horsePositionsRef.current[id];
          if (rawPct == null || isNaN(rawPct)) return;

          const pct = Math.min(Math.max(rawPct, 0), 1);
          if (pct < 1) allFinished = false;

          const path = horsePathsRef.current[id];
          if (!path || path.length === 0) return;

          const pathIndex = Math.floor(pct * (path.length - 1));
          const [x, y] = path[pathIndex] || [];
          if (x == null || y == null) return;

          sprite.x = x;
          sprite.y = y;

          if (pathIndex + 1 < path.length) {
            const [nx, ny] = path[pathIndex + 1];
            sprite.rotation = Math.atan2(ny - y, nx - x);
          }

          if (frameCounter % 5 === 0) {
            debugLog(`🐎 Horse ${id} → pct=${pct.toFixed(3)}, idx=${pathIndex}, x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
          }
        });

        if (allFinished && !finishedRef.current) {
          finishedRef.current = true;
          debugLog('🏁 Race complete! All horses have finished.');
        }
      });
    } catch (e) {
      errorLog('Pixi init error:', e);
    }
    return () => appRef.current?.destroy(true);
  }, [raceMode]);

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
      try {
        app.stage?.addChild(sprite);
      } catch {}
      debugLog(`🎨 Sprite created: Horse ${key}, lane ${idx}`);
    });
  }, [horses]);

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-96" />
      <div className="mt-4 space-x-2">
        <button
          onClick={startTestRace}
          className="bg-blue-600 px-4 py-2 text-white rounded"
        >
          Start Test Race
        </button>
        {pastRaces.length > 0 && (
          <select
            className="bg-white border border-gray-300 px-4 py-2 rounded"
            value={selectedRaceId || ''}
            onChange={e => {
              setSelectedRaceId(e.target.value);
              loadReplay(e.target.value);
            }}
          >
            <option value="" disabled>Select a replay</option>
            {pastRaces.map(r => (
              <option key={r.raceId} value={r.raceId}>{r.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default RaceTrack;
