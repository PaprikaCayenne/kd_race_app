// File: frontend/src/components/RaceTrack.jsx
// Version: v0.9.19 — Split race generation and movement + always show start line

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { drawGreyOvalTrack } from '@/utils/drawGreyOvalTrack';
import { generateRoundedRectCenterline } from '@/utils/generateRoundedRectCenterline';
import { generatePondShape } from '@/utils/generatePondShape';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';
import { io } from 'socket.io-client';
import pako from 'pako';

const socket = io('/race', { path: '/api/socket.io' });
window.__KD_RACE_APP_VERSION__ = 'v0.9.19';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

const debugLog = (...args) => console.log('[KD]', ...args);

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePathsRef = useRef({});
  const currentPctsRef = useRef({});
  const horsesRef = useRef([]);
  const raceTickerRef = useRef(null); // for manual tick loop

  const centerlineRef = useRef([]);
  const innerBoundsRef = useRef(null);
  const outerBoundsRef = useRef(null);
  const startAtRef = useRef(null);
  const startLineRef = useRef(null);
  const markerRef = useRef(null);
  const horseDebugPathsRef = useRef([]);

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;
    const app = new Application({ view: canvasRef.current, backgroundColor: 0xd0f0e0, resizeTo: canvasRef.current.parentElement });
    appRef.current = app;

    const { innerBounds, outerBounds } = drawGreyOvalTrack(app, app.view.parentElement);
    const minLength = Math.min(innerBounds.pointsArray.length, outerBounds.pointsArray.length);
    innerBounds.pointsArray = innerBounds.pointsArray.slice(0, minLength);
    outerBounds.pointsArray = outerBounds.pointsArray.slice(0, minLength);

    innerBoundsRef.current = innerBounds;
    outerBoundsRef.current = outerBounds;

    const midBounds = {
      x: (innerBounds.x + outerBounds.x) / 2,
      y: (innerBounds.y + outerBounds.y) / 2,
      width: (innerBounds.width + outerBounds.width) / 2,
      height: (innerBounds.height + outerBounds.height) / 2
    };

    const centerline = generateRoundedRectCenterline(midBounds, 120, 400);
    centerlineRef.current = centerline;

    const startIdx = Math.floor(centerline.length * 0.55);
    startAtRef.current = centerline[startIdx];

    const triangle = new Graphics();
    const angle = Math.atan2(centerline[startIdx + 1].y - centerline[startIdx].y, centerline[startIdx + 1].x - centerline[startIdx].x);
    const size = 10;
    const tip = { x: centerline[startIdx].x + Math.cos(angle) * size, y: centerline[startIdx].y + Math.sin(angle) * size };
    const left = { x: centerline[startIdx].x + Math.cos(angle + Math.PI * 2 / 3) * size, y: centerline[startIdx].y + Math.sin(angle + Math.PI * 2 / 3) * size };
    const right = { x: centerline[startIdx].x + Math.cos(angle - Math.PI * 2 / 3) * size, y: centerline[startIdx].y + Math.sin(angle - Math.PI * 2 / 3) * size };

    triangle.lineStyle(2, 0x00ff00);
    triangle.moveTo(tip.x, tip.y);
    triangle.lineTo(left.x, left.y);
    triangle.moveTo(tip.x, tip.y);
    triangle.lineTo(right.x, right.y);

    triangle.lineStyle(2, 0x000000);
    triangle.moveTo(left.x, left.y);
    triangle.lineTo(right.x, right.y);

    const line = new Graphics();
    const dx = centerline[startIdx + 1].x - centerline[startIdx].x;
    const dy = centerline[startIdx + 1].y - centerline[startIdx].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const normX = -dy / len;
    const normY = dx / len;
    line.lineStyle(4, 0x00ff00);
    line.moveTo(centerline[startIdx].x + normX * 100, centerline[startIdx].y + normY * 100);
    line.lineTo(centerline[startIdx].x - normX * 100, centerline[startIdx].y - normY * 100);

    app.stage.addChild(line);
    app.stage.addChild(triangle);
    startLineRef.current = line;
    markerRef.current = triangle;

    const pond = new Graphics();
    const pondPoints = generatePondShape(innerBounds.x + 80, innerBounds.y + 100, 120, 80);
    pond.beginFill(0x66ccff);
    pond.moveTo(pondPoints[0].x, pondPoints[0].y);
    pondPoints.forEach(p => pond.lineTo(p.x, p.y));
    pond.endFill();
    app.stage.addChild(pond);
  }, []);

  useEffect(() => {
    if (!debugVisible) {
      horseDebugPathsRef.current.forEach(p => appRef.current?.stage.removeChild(p));
      horseDebugPathsRef.current = [];
      return;
    }

    horsesRef.current.forEach(horse => {
      const path = horsePathsRef.current[horse.id];
      const hexColor = parseColorStringToHex(horse.color, horse.id);
      const debugLine = new Graphics();
      debugLine.lineStyle(1, hexColor);
      path.forEach((p, i) => {
        if (i === 0) debugLine.moveTo(p.x, p.y);
        else debugLine.lineTo(p.x, p.y);
      });
      appRef.current.stage.addChild(debugLine);
      horseDebugPathsRef.current.push(debugLine);
    });
  }, [debugVisible]);

  useEffect(() => {
    socket.on('connect', () => debugLog('Connected to race socket'));

    socket.on('race:init', (data) => {
      let decompressed;
      try {
        if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
          const inflated = pako.inflate(new Uint8Array(data), { to: 'string' });
          decompressed = JSON.parse(inflated);
          debugLog('[KD] 🔥 Decompression successful');
        } else {
          decompressed = data;
        }
      } catch (e) {
        console.error('[KD] 🔥 Decompression error:', e);
        return;
      }

      horsesRef.current = decompressed.horses;
      horsePathsRef.current = {};
      currentPctsRef.current = {};
      horseSpritesRef.current.forEach(sprite => appRef.current.stage.removeChild(sprite));
      horseSpritesRef.current.clear();

      decompressed.horses.forEach(horse => {
        horsePathsRef.current[horse.id] = horse.path;
        const sprite = createHorseSprite(horse.color, horse.id, appRef.current);
        if (sprite.anchor?.set) sprite.anchor.set(0.5);
        sprite.position.set(horse.path[0].x, horse.path[0].y);
        appRef.current.stage.addChild(sprite);
        horseSpritesRef.current.set(horse.id, sprite);
      });

      setRaceReady(true);
      debugLog('[KD] 🔹 Horse paths received:', Object.keys(horsePathsRef.current));
    });

    return () => {
      socket.off('connect');
      socket.off('race:init');
    };
  }, []);

  const runManualTicks = () => {
    const pcts = {};
    horsesRef.current.forEach(horse => (pcts[horse.id] = 0));

    if (raceTickerRef.current) cancelAnimationFrame(raceTickerRef.current);

    const animate = () => {
      let stillRunning = false;
      for (const horse of horsesRef.current) {
        if (pcts[horse.id] < 100) {
          pcts[horse.id] += Math.random() * 1.5 + 0.5; // simulate 0.5–2% advance per frame
          currentPctsRef.current[horse.id] = Math.min(pcts[horse.id], 100);
          stillRunning = true;
        }
      }
      if (stillRunning) raceTickerRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const generateRace = async () => {
    try {
      const res = await fetch('/api/admin/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': '6a2e8819c6fb4c15' },
        body: JSON.stringify({
          centerline: centerlineRef.current,
          innerBoundary: innerBoundsRef.current?.pointsArray || [],
          outerBoundary: outerBoundsRef.current?.pointsArray || [],
          startAt: startAtRef.current
        })
      });
      const data = await res.json();
      debugLog('🏁 Race generated:', data);
    } catch (err) {
      console.error('Error generating race:', err);
    }
  };

  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.ticker.add(() => {
      for (const [horseId, sprite] of horseSpritesRef.current.entries()) {
        const path = horsePathsRef.current[horseId];
        const pct = currentPctsRef.current[horseId];
        if (!path || pct == null || !sprite) continue;
        const t = pct / 100;
        const i = Math.floor(t * (path.length - 1));
        const j = Math.min(i + 1, path.length - 1);
        const frac = t * (path.length - 1) - i;
        const pos = {
          x: path[i].x + frac * (path[j].x - path[i].x),
          y: path[i].y + frac * (path[j].y - path[i].y)
        };
        sprite.position.set(pos.x, pos.y);
      }
    });
  }, []);

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-[600px]" />
      <div className="mt-4 space-x-2">
        <button onClick={generateRace} className="bg-blue-600 px-4 py-2 text-white rounded">Generate Race</button>
        <button onClick={runManualTicks} disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Debug Visual</button>
      </div>
    </div>
  );
};

export default RaceTrack;
