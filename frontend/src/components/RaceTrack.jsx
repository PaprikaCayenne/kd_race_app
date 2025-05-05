// File: frontend/src/components/RaceTrack.jsx
// Version: v0.9.69 — Applies inverse rotation to horse positions and paths to match unrotated Pixi canvas

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { renderPond } from '@/utils/renderPond';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';
import { io } from 'socket.io-client';
import pako from 'pako';

const socket = io('/race', { path: '/api/socket.io' });
const startAtPercent = 0.67;
const canvasHeight = 800;

window.__KD_RACE_APP_VERSION__ = 'v0.9.69';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

const rotatePointBack = (p, angle, origin) => {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
};

const RaceTrack = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePathsRef = useRef({});
  const horsesRef = useRef([]);

  const startLineRef = useRef(null);
  const trackDataRef = useRef(null);
  const debugDotsRef = useRef([]);
  const debugPathLinesRef = useRef([]);

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);

  const computeTrackAngle = (centerline) => {
    if (!centerline || centerline.length < 2) return 0;
    const dx = centerline[1].x - centerline[0].x;
    const dy = centerline[1].y - centerline[0].y;
    return Math.atan2(dy, dx);
  };

  const drawDerbyTrack = ({ innerBoundary, outerBoundary, centerline, startAt, startLineAt }) => {
    if (!appRef.current) return;
    const app = appRef.current;
    app.stage.removeChildren();
    app.stage.sortableChildren = true;

    const g = new Graphics();
    g.beginFill(0x996633);
    outerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
    for (let i = innerBoundary.length - 1; i >= 0; i--) g.lineTo(innerBoundary[i].x, innerBoundary[i].y);
    g.endFill();

    g.lineStyle(3, 0xffffff);
    outerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
    g.lineTo(outerBoundary[0].x, outerBoundary[0].y);
    innerBoundary.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
    g.lineTo(innerBoundary[0].x, innerBoundary[0].y);
    app.stage.addChild(g);

    if (startLineAt && centerline.length > 0) {
      const idx = centerline.findIndex(p => p.x === startAt.x && p.y === startAt.y);
      const next = centerline[(idx + 1) % centerline.length];
      const dx = next.x - startAt.x;
      const dy = next.y - startAt.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const normX = -dy / len;
      const normY = dx / len;
      const halfLength = 60;

      const line = new Graphics();
      line.lineStyle(4, 0x00ff00);
      line.moveTo(startLineAt.x + normX * halfLength, startLineAt.y + normY * halfLength);
      line.lineTo(startLineAt.x - normX * halfLength, startLineAt.y - normY * halfLength);
      app.stage.addChild(line);
      startLineRef.current = line;
    }

    renderPond(app, innerBoundary);
  };

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const width = containerRef.current.offsetWidth;
    const app = new Application({
      view: canvasRef.current,
      backgroundColor: 0xd0f0e0,
      width,
      height: canvasHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    app.stage.sortableChildren = true;
    appRef.current = app;

    fetch(`/api/track?startAtPercent=${startAtPercent}&width=${width}&height=${canvasHeight}`)
      .then(res => res.json())
      .then(track => {
        trackDataRef.current = track;
        drawDerbyTrack(track);
      })
      .catch(err => console.error('[KD] ❌ Track fetch failed:', err));
  }, []);

  useEffect(() => {
    socket.on('connect', () => console.log('[KD] ✅ Connected to race socket'));

    socket.on('race:init', (data) => {
      try {
        const inflated = pako.inflate(new Uint8Array(data), { to: 'string' });
        const parsed = JSON.parse(inflated);
        const { horses } = parsed;

        const track = trackDataRef.current;
        const trackAngle = computeTrackAngle(track.centerline);
        const origin = track.centerline[0];

        horseSpritesRef.current.forEach(sprite => appRef.current.stage.removeChild(sprite));
        horseSpritesRef.current.clear();
        debugDotsRef.current.forEach(dot => appRef.current.stage.removeChild(dot));
        debugDotsRef.current = [];
        debugPathLinesRef.current.forEach(line => appRef.current.stage.removeChild(line));
        debugPathLinesRef.current = [];

        horsesRef.current = horses;
        horsePathsRef.current = {};

        horses.forEach(horse => {
          const rawStart = horse.startPoint;
          const path = horse.path.map(pt => rotatePointBack(pt, trackAngle, origin));
          const start = rotatePointBack(rawStart, trackAngle, origin);
          const pathStart = path[0];
          const pathNext = path[1];

          const dx = pathNext.x - pathStart.x;
          const dy = pathNext.y - pathStart.y;
          const dist = Math.sqrt((pathStart.x - start.x) ** 2 + (pathStart.y - start.y) ** 2);

          console.log(`[KD] 🧭 Horse ${horse.id} (placement ${horse.placement}) startPoint:`, start);
          console.log(`[KD] 🧵 Horse ${horse.id} path[0]:`, pathStart);
          console.log(`[KD] 📏 Distance between start and path[0]: ${dist.toFixed(2)} px`);

          const sprite = createHorseSprite(horse.color, horse.id, appRef.current);
          sprite.anchor?.set?.(0.5);
          sprite.zIndex = 5;
          sprite.position.set(start.x, start.y);
          sprite.rotation = Math.atan2(dy, dx);

          appRef.current.stage.addChild(sprite);
          horseSpritesRef.current.set(horse.id, sprite);
          horsePathsRef.current[horse.id] = path;

          const dot = new Graphics();
          dot.beginFill(0xffffff).drawCircle(0, 0, 4).endFill();
          dot.zIndex = 99;
          dot.position.set(start.x, start.y);
          debugDotsRef.current.push(dot);
          if (debugVisible) appRef.current.stage.addChild(dot);

          const offsetLine = new Graphics();
          offsetLine.lineStyle(2, 0xff00ff);
          offsetLine.moveTo(start.x, start.y);
          offsetLine.lineTo(start.x + horse.debug?.offset?.perpX * 40, start.y + horse.debug?.offset?.perpY * 40);
          offsetLine.zIndex = 100;
          debugDotsRef.current.push(offsetLine);
          if (debugVisible) appRef.current.stage.addChild(offsetLine);
        });

        setRaceReady(true);
        console.log('[KD] 🐎 Horses initialized');
      } catch (e) {
        console.error('[KD] ❌ Failed to decode race:init:', e);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('race:init');
    };
  }, []);

  return (
    <div ref={containerRef} className="p-4">
      <canvas ref={canvasRef} className="block w-full h-[800px]" />
      <div className="mt-4 space-x-2">
        <button onClick={() => fetch('/api/admin/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-pass': '6a2e8819c6fb4c15'
          },
          body: JSON.stringify({ startAtPercent, width: containerRef.current.offsetWidth, height: canvasHeight })
        })} className="bg-blue-600 px-4 py-2 text-white rounded">Generate Horses</button>
        <button disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Visuals</button>
      </div>
    </div>
  );
};

export default RaceTrack;