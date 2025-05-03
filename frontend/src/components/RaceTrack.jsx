// File: frontend/src/components/RaceTrack.jsx
// Version: v0.9.53 — Adds red debug dots and logs to inspect horse startPoint alignment

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { renderPond } from '@/utils/renderPond';
import { io } from 'socket.io-client';
import pako from 'pako';

const socket = io('/race', { path: '/api/socket.io' });
const startAtPercent = 0.67;
const canvasHeight = 800;

window.__KD_RACE_APP_VERSION__ = 'v0.9.53';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

const RaceTrack = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePathsRef = useRef({});
  const horsesRef = useRef([]);

  const markerRef = useRef(null);
  const startLineRef = useRef(null);
  const trackDataRef = useRef(null);
  const debugDotsRef = useRef([]);

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);

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

      const angle = Math.atan2(dy, dx);
      const size = 10;
      const tip = { x: startAt.x + Math.cos(angle) * size, y: startAt.y + Math.sin(angle) * size };
      const left = { x: startAt.x + Math.cos(angle + Math.PI * 2 / 3) * size, y: startAt.y + Math.sin(angle + Math.PI * 2 / 3) * size };
      const right = { x: startAt.x + Math.cos(angle - Math.PI * 2 / 3) * size, y: startAt.y + Math.sin(angle - Math.PI * 2 / 3) * size };

      const triangle = new Graphics();
      triangle.lineStyle(2, 0x00ff00).moveTo(tip.x, tip.y).lineTo(left.x, left.y);
      triangle.moveTo(tip.x, tip.y).lineTo(right.x, right.y);
      triangle.lineStyle(2, 0x000000).moveTo(left.x, left.y).lineTo(right.x, right.y);
      markerRef.current = triangle;
      if (debugVisible) app.stage.addChild(triangle);
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

        horseSpritesRef.current.forEach(sprite => appRef.current.stage.removeChild(sprite));
        horseSpritesRef.current.clear();

        debugDotsRef.current.forEach(dot => appRef.current.stage.removeChild(dot));
        debugDotsRef.current = [];

        horsesRef.current = horses;
        horsePathsRef.current = {};

        horses.forEach(horse => {
          const path = horse.path;
          const sprite = createHorseSprite(horse.color, horse.id, appRef.current);
          sprite.anchor?.set?.(0.5);
          sprite.zIndex = 5;
          sprite.position.set(horse.startPoint.x, horse.startPoint.y);

          if (path.length >= 2) {
            const dx = path[1].x - path[0].x;
            const dy = path[1].y - path[0].y;
            sprite.rotation = Math.atan2(dy, dx);
          }

          appRef.current.stage.addChild(sprite);
          horseSpritesRef.current.set(horse.id, sprite);
          horsePathsRef.current[horse.id] = path;

          // White debug dot
          const whiteDot = new Graphics();
          whiteDot.beginFill(0xffffff).drawCircle(0, 0, 6).endFill();
          whiteDot.zIndex = 99;
          whiteDot.position.set(horse.startPoint.x, horse.startPoint.y);
          debugDotsRef.current.push(whiteDot);
          if (debugVisible) appRef.current.stage.addChild(whiteDot);

          // Red dot for alignment check
          const redDot = new Graphics();
          redDot.beginFill(0xff0000).drawCircle(0, 0, 3).endFill();
          redDot.position.set(horse.startPoint.x, horse.startPoint.y);
          redDot.zIndex = 100;
          if (debugVisible) appRef.current.stage.addChild(redDot);

          console.log(`[KD] 🧭 Horse ${horse.id} startPoint:`, horse.startPoint);
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

  useEffect(() => {
    if (!appRef.current) return;
    debugDotsRef.current.forEach(dot => {
      if (debugVisible) {
        if (!appRef.current.stage.children.includes(dot)) {
          appRef.current.stage.addChild(dot);
        }
      } else {
        appRef.current.stage.removeChild(dot);
      }
    });
  }, [debugVisible]);

  const triggerGenerateHorses = async () => {
    const width = containerRef.current.offsetWidth;

    try {
      await fetch('/api/admin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': '6a2e8819c6fb4c15'
        },
        body: JSON.stringify({
          startAtPercent,
          width,
          height: canvasHeight
        })
      });
    } catch (err) {
      console.error('❌ Error triggering race:', err);
    }
  };

  return (
    <div ref={containerRef} className="p-4">
      <canvas ref={canvasRef} className="block w-full h-[800px]" />
      <div className="mt-4 space-x-2">
        <button onClick={triggerGenerateHorses} className="bg-blue-600 px-4 py-2 text-white rounded">Generate Horses</button>
        <button disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Visuals</button>
      </div>
    </div>
  );
};

export default RaceTrack;
