// File: frontend/src/components/RaceTrack.jsx
// Version: v0.7.79 – Persist race metadata before ticks to avoid foreign key violation

import React, { useEffect, useRef, useState } from 'react';
import { Application } from '@pixi/app';
import { Graphics } from '@pixi/graphics';
import { Color } from '@pixi/core';
import '@pixi/display';
import io from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);
const errorLog = (...args) => console.error('[ERROR]', ...args);

window.__KD_RACE_APP_VERSION__ = 'v0.7.79';
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
  const trackBoundsRef = useRef({});
  const frameCounterRef = useRef(0);
  const finishedRef = useRef(false);

  const replayFramesRef = useRef([]);
  const replayIndexRef = useRef(0);

  const speedFactor = 0.3;

  useEffect(() => {
    debugLog('WebSocket initializing...');
    socket = io('/race', { path: '/api/socket.io' });
    socket.on('connect', () => debugLog('[WS] Connected:', socket.id));

    socket.on('race:init', data => {
      debugLog('[WS] race:init', data);
      finishedRef.current = false;
      replayFramesRef.current = [];
      replayIndexRef.current = 0;
      setRaceMode('live');
      horsePositionsRef.current = Object.fromEntries(
        data.horses.map(h => [h.id, 0])
      );
      const app = appRef.current;
      if (app?.stage) {
        horseSpritesRef.current.forEach(s => {
          try {
            app.stage.removeChild(s);
          } catch {}
        });
      }
      horseSpritesRef.current.clear();
      setHorses(data.horses);
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
    fetch('/api/races')
      .then(res => res.json())
      .then(data => setPastRaces(data))
      .catch(err => errorLog('Failed to fetch past races', err));
  }, []);

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
        const boundaryInset = 4 * 25 + 10;
        const spriteBuffer = 6;
        const track = new Graphics();

        const innerY = cy - (baseRY - boundaryInset) + spriteBuffer;
        const outerY = cy + (baseRY + outerGap) - spriteBuffer;

        trackBoundsRef.current = {
          cx, cy, baseRX, baseRY, outerGap, boundaryInset, innerY, outerY
        };

        debugLog('📏 Finish line Y-coords:', { innerY, outerY });
        debugLog('📍 Track center X:', cx);

        track.lineStyle(5, 0x333333);
        track.drawRoundedRect(cx - (baseRX + outerGap), cy - (baseRY + outerGap), (baseRX + outerGap) * 2, (baseRY + outerGap) * 2, 100);

        track.lineStyle(5, 0x333333);
        track.drawRoundedRect(cx - (baseRX - boundaryInset), cy - (baseRY - boundaryInset), (baseRX - boundaryInset) * 2, (baseRY - boundaryInset) * 2, 100);

        track.lineStyle(6, 0xff0000);
        track.moveTo(cx, innerY);
        track.lineTo(cx, outerY);

        app.stage.addChild(track);
      };

      drawTrack();

      app.ticker.add(() => {
        const { cx, cy, baseRX, baseRY } = trackBoundsRef.current;
        const laneGap = 25;
        const spriteRadius = 12;
        const frameCounter = ++frameCounterRef.current;
        let allFinished = true;

        if (raceMode === 'replay') {
          if (replayIndexRef.current < replayFramesRef.current.length) {
            const tick = replayFramesRef.current[replayIndexRef.current++];
            horsePositionsRef.current[tick.horseId] = tick.pct / 100;
          }
        }

        horseSpritesRef.current.forEach((sprite, id) => {
          const rawPct = horsePositionsRef.current[id] || 0;
          const pct = Math.min(Math.max(rawPct, 0), 1);
          if (pct < 1) allFinished = false;

          const idx = sprite._idx;
          const rX = baseRX - idx * laneGap;
          const rY = baseRY - idx * laneGap;

          const angle = Math.PI / 2 + pct * 2 * Math.PI * speedFactor;
          const effRX = rX - spriteRadius;
          const effRY = rY - spriteRadius;

          sprite.x = cx + effRX * Math.cos(angle);
          sprite.y = cy + effRY * Math.sin(angle);
          sprite.rotation = angle + Math.PI / 2;

          if (frameCounter % 5 === 0) {
            debugLog(`🐎 Horse ${id} → pct=${pct.toFixed(3)}, angle=${angle.toFixed(2)}, x=${sprite.x.toFixed(1)}, y=${sprite.y.toFixed(1)}`);
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

  const startTestRace = async () => {
    debugLog('startTestRace');
    if (!socket || socket.disconnected) return;
    const res = await fetch('/api/horses');
    const list = await res.json();
    socket.emit('startRace', { raceId: Date.now(), horses: list.slice(0, 4) });
  };

  const loadReplay = async (raceId) => {
    debugLog('📥 Loading replay for race', raceId);
    const res = await fetch(`/api/race/${raceId}/replay`);
    const { frames } = await res.json();
    replayFramesRef.current = frames;
    setRaceMode('replay');
    replayIndexRef.current = 0;
    finishedRef.current = false;
  };

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-96" />
      <div className="mt-4 space-x-2">
        <button onClick={startTestRace} className="bg-blue-600 px-4 py-2 text-white rounded">
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
