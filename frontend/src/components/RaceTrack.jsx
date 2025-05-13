// File: frontend/src/components/RaceTrack.jsx
// Version: v1.0.0 — Aligns horse nose to start line using dynamic sprite width

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics, Text } from 'pixi.js';
import { io } from 'socket.io-client';
import pako from 'pako';
import { createHorseSprite } from '@/utils/createHorseSprite';
import { renderPond } from '@/utils/renderPond';
import { parseColorStringToHex } from '@/utils/parseColorStringToHex';
import { playRace } from '@/utils/playRace';

const VERSION = 'v1.0.0';
const socket = io('/race', { path: '/api/socket.io' });
const canvasHeight = 800;
const startAtPercent = 0.55;

const RaceTrack = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const labelSpritesRef = useRef(new Map());
  const debugDotsRef = useRef([]);
  const debugPathLinesRef = useRef([]);
  const centerlineGraphicRef = useRef(null);
  const trackDataRef = useRef(null);
  const horsePathsRef = useRef({});
  const horsesRef = useRef([]);
  const finishedHorsesRef = useRef(new Set());

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);

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

    const center = innerBoundary.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    center.x /= innerBoundary.length;
    center.y /= innerBoundary.length;
    renderPond(app, center, 60);

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
    console.log(`[KD] ✅ Loaded: RaceTrack version ${VERSION}`);
    console.log(`[KD] ✅ Loaded: Frontend version ${window.__KD_RACE_APP_VERSION__}`);
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

        horsesRef.current = horses;
        finishedHorsesRef.current.clear();
        horseSpritesRef.current.forEach(s => appRef.current.stage.removeChild(s));
        labelSpritesRef.current.forEach(t => appRef.current.stage.removeChild(t));
        horseSpritesRef.current.clear();
        labelSpritesRef.current.clear();
        debugDotsRef.current.forEach(d => appRef.current.stage.removeChild(d));
        debugPathLinesRef.current.forEach(l => appRef.current.stage.removeChild(l));
        debugDotsRef.current = [];
        debugPathLinesRef.current = [];

        horses.forEach(horse => {
          const { id, path, startPoint, placement, color } = horse;
          const sprite = createHorseSprite(color, id, appRef.current);
          sprite.anchor?.set?.(0.5);
          sprite.zIndex = 5;
          sprite.__progress = 0;

          const dx = path[1].x - path[0].x;
          const dy = path[1].y - path[0].y;
          const len = Math.sqrt(dx ** 2 + dy ** 2);
          const dirX = dx / len;
          const dirY = dy / len;

          const adjustedX = startPoint.x + dirX * (sprite.width / 2);
          const adjustedY = startPoint.y + dirY * (sprite.height / 2);
          sprite.position.set(adjustedX, adjustedY);
          sprite.rotation = Math.atan2(dy, dx);

          appRef.current.stage.addChild(sprite);
          horseSpritesRef.current.set(id, sprite);

          const label = new Text(`${placement}`, {
            fontSize: 12,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2
          });
          label.anchor.set(0.5);
          label.position.set(adjustedX, adjustedY);
          label.zIndex = 6;
          labelSpritesRef.current.set(id, label);
          if (debugVisible) appRef.current.stage.addChild(label);

          const dot = new Graphics();
          dot.beginFill(0x00ff00).drawCircle(0, 0, 4).endFill();
          dot.zIndex = 99;
          dot.position.set(adjustedX, adjustedY);
          debugDotsRef.current.push(dot);
          if (debugVisible) appRef.current.stage.addChild(dot);

          const pathLine = new Graphics();
          pathLine.lineStyle(1, parseColorStringToHex(color, id));
          pathLine.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            pathLine.quadraticCurveTo(p1.x, p1.y, cx, cy);
          }
          pathLine.lineTo(path.at(-1).x, path.at(-1).y);
          pathLine.zIndex = 1;
          debugPathLinesRef.current.push(pathLine);
          if (debugVisible) appRef.current.stage.addChild(pathLine);

          horsePathsRef.current[id] = path;
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

    labelSpritesRef.current.forEach(label => {
      if (debugVisible && !app.stage.children.includes(label)) app.stage.addChild(label);
      else if (!debugVisible) app.stage.removeChild(label);
    });

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
    playRace({
      app: appRef.current,
      horseSprites: horseSpritesRef.current,
      horsePaths: horsePathsRef.current,
      labelSprites: labelSpritesRef.current,
      finishedHorses: finishedHorsesRef.current,
      horses: horsesRef.current
    });
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
