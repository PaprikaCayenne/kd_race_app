// File: frontend/src/components/RaceTrack.jsx
// Version: v0.9.79 — Cleaned full file: correct debug visuals + race track rendering

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { io } from 'socket.io-client';
import pako from 'pako';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { renderPond } from '@/utils/renderPond';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';

const socket = io('/race', { path: '/api/socket.io' });
const canvasHeight = 800;
const startAtPercent = 0.67;

const rotatePointBack = (pt, angle, origin) => {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos
  };
};

const RaceTrack = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const debugDotsRef = useRef([]);
  const debugPathLinesRef = useRef([]);
  const centerlineGraphicRef = useRef(null);
  const trackDataRef = useRef(null);
  const horsePathsRef = useRef({});
  const horsesRef = useRef([]);

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);

  const computeTrackAngle = (centerline) => {
    if (!centerline || centerline.length < 2) return 0;
    const dx = centerline[1].x - centerline[0].x;
    const dy = centerline[1].y - centerline[0].y;
    return Math.atan2(dy, dx);
  };

  const drawDerbyTrack = ({ innerBoundary, outerBoundary, rotatedCenterline, startLineAt }) => {
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

    if (startLineAt && rotatedCenterline.length > 1) {
      const start = rotatedCenterline[0];
      const next = rotatedCenterline[1];
      const dx = next.x - start.x;
      const dy = next.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const normX = -dy / len;
      const normY = dx / len;

      const line = new Graphics();
      line.lineStyle(4, 0x00ff00);
      line.moveTo(startLineAt.x + normX * 60, startLineAt.y + normY * 60);
      line.lineTo(startLineAt.x - normX * 60, startLineAt.y - normY * 60);
      app.stage.addChild(line);
    }

    renderPond(app, innerBoundary);

    const centerlineG = new Graphics();
    centerlineG.lineStyle(1, 0x00ff00);
    centerlineG.moveTo(rotatedCenterline[0].x, rotatedCenterline[0].y);
    for (let i = 1; i < rotatedCenterline.length; i++) {
      centerlineG.lineTo(rotatedCenterline[i].x, rotatedCenterline[i].y);
    }
    centerlineG.zIndex = 0;
    centerlineGraphicRef.current = centerlineG;
    if (debugVisible) app.stage.addChild(centerlineG);
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
        const { horses } = JSON.parse(inflated);
        const track = trackDataRef.current;
        const origin = track.rotatedCenterline?.[0];
        const angle = computeTrackAngle(track.rotatedCenterline);

        horsesRef.current = horses;
        horseSpritesRef.current.forEach(s => appRef.current.stage.removeChild(s));
        horseSpritesRef.current.clear();
        debugDotsRef.current.forEach(d => appRef.current.stage.removeChild(d));
        debugPathLinesRef.current.forEach(l => appRef.current.stage.removeChild(l));
        debugDotsRef.current = [];
        debugPathLinesRef.current = [];

        horses.forEach(horse => {
          const rotatedStart = rotatePointBack(horse.startPoint, angle, origin);
          const rotatedPath = horse.path.map(p => rotatePointBack(p, angle, origin));

          const sprite = createHorseSprite(horse.color, horse.id, appRef.current);
          sprite.anchor?.set?.(0.5);
          sprite.zIndex = 5;
          sprite.position.set(rotatedStart.x, rotatedStart.y);
          sprite.rotation = Math.atan2(rotatedPath[1].y - rotatedPath[0].y, rotatedPath[1].x - rotatedPath[0].x);
          appRef.current.stage.addChild(sprite);
          horseSpritesRef.current.set(horse.id, sprite);

          const dot = new Graphics();
          dot.beginFill(0xffffff).drawCircle(0, 0, 4).endFill();
          dot.zIndex = 99;
          dot.position.set(rotatedStart.x, rotatedStart.y);
          debugDotsRef.current.push(dot);
          if (debugVisible) appRef.current.stage.addChild(dot);

          const line = new Graphics();
          line.lineStyle(1, parseColorStringToHex(horse.color, horse.id));
          if (rotatedPath.length > 1) {
            line.moveTo(rotatedPath[0].x, rotatedPath[0].y);
            for (let i = 1; i < rotatedPath.length - 1; i++) {
              const p1 = rotatedPath[i];
              const p2 = rotatedPath[i + 1];
              const cx = (p1.x + p2.x) / 2;
              const cy = (p1.y + p2.y) / 2;
              line.quadraticCurveTo(p1.x, p1.y, cx, cy);
            }
            line.lineTo(rotatedPath.at(-1).x, rotatedPath.at(-1).y);
          }
          line.zIndex = 1;
          debugPathLinesRef.current.push(line);
          if (debugVisible) appRef.current.stage.addChild(line);
        });

        setRaceReady(true);
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
    const app = appRef.current;
    if (!app) return;

    const toggle = (items, visible) => {
      items.forEach(item => {
        if (visible && !app.stage.children.includes(item)) app.stage.addChild(item);
        else if (!visible) app.stage.removeChild(item);
      });
    };

    toggle(debugDotsRef.current, debugVisible);
    toggle(debugPathLinesRef.current, debugVisible);

    if (centerlineGraphicRef.current) {
      if (debugVisible && !app.stage.children.includes(centerlineGraphicRef.current)) {
        app.stage.addChild(centerlineGraphicRef.current);
      } else if (!debugVisible) {
        app.stage.removeChild(centerlineGraphicRef.current);
      }
    }
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
        body: JSON.stringify({ startAtPercent, width, height: canvasHeight })
      });
    } catch (err) {
      console.error('❌ Error triggering race:', err);
    }
  };

  const triggerStartRace = () => {
    if (raceReady) socket.emit('race:start');
  };

  return (
    <div ref={containerRef} className="p-4">
      <canvas ref={canvasRef} className="block w-full h-[800px]" />
      <div className="mt-4 space-x-2">
        <button onClick={triggerGenerateHorses} className="bg-blue-600 px-4 py-2 text-white rounded">Generate Horses</button>
        <button onClick={triggerStartRace} disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Visuals</button>
      </div>
    </div>
  );
};

export default RaceTrack;
