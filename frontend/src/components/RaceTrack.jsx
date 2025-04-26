// File: frontend/src/components/RaceTrack.jsx
// Version: v0.8.92 – Full restore + true bottom center starting point

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { drawGreyOvalTrack } from '@/utils/drawGreyOvalTrack';
import { animateHorseSprites } from '@/utils/animateHorseSprites';
import { generateRoundedRectCenterline } from '@/utils/generateRoundedRectCenterline';
import { generatePondShape } from '@/utils/generatePondShape';
import { io } from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);

const socket = io('/race', { path: '/api/socket.io' });

window.__KD_RACE_APP_VERSION__ = 'v0.8.92';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

function interpolatePath(path, pct) {
  const t = pct / 100;
  const total = path.length;
  const exact = t * (total - 1);
  const i = Math.floor(exact);
  const j = Math.min(i + 1, total - 1);
  const frac = exact - i;
  const p1 = path[i];
  const p2 = path[j];
  return {
    x: p1.x + frac * (p2.x - p1.x),
    y: p1.y + frac * (p2.y - p1.y)
  };
}

function findBottomCenterPoint(centerline) {
  let bottomY = -Infinity;
  centerline.forEach(p => {
    if (p.y > bottomY) bottomY = p.y;
  });
  const tolerance = 20;
  const bottomCandidates = centerline.filter(p => Math.abs(p.y - bottomY) < tolerance);
  const averageX = bottomCandidates.reduce((sum, p) => sum + p.x, 0) / bottomCandidates.length;
  let closest = bottomCandidates[0];
  bottomCandidates.forEach(p => {
    if (Math.abs(p.x - averageX) < Math.abs(closest.x - averageX)) closest = p;
  });
  return closest;
}

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePathsRef = useRef({});
  const currentPctsRef = useRef({});
  const [pastRaces, setPastRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugVisible, setDebugVisible] = useState(false);
  const fallbackTrackRef = useRef(null);
  const centerlineRef = useRef([]);
  const innerBoundsRef = useRef(null);
  const outerBoundsRef = useRef(null);
  const startLineRef = useRef(null);
  const startAtRef = useRef(null);
  const markerRef = useRef(null);

  function drawStartLine(start, next) {
    const app = appRef.current;
    if (!app) return;
    if (startLineRef.current) app.stage.removeChild(startLineRef.current);
    const dx = next.x - start.x;
    const dy = next.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const normX = -dy / len;
    const normY = dx / len;
    const trackWidth = (outerBoundsRef.current.width - innerBoundsRef.current.width) / 2 * 0.92;
    const line = new Graphics();
    line.lineStyle(4, 0x00ff00);
    line.moveTo(start.x + normX * trackWidth, start.y + normY * trackWidth);
    line.lineTo(start.x - normX * trackWidth, start.y - normY * trackWidth);
    app.stage.addChild(line);
    startLineRef.current = line;
  }

  function drawDebugTriangle(center, direction) {
    const app = appRef.current;
    if (!app) return;
    if (markerRef.current) app.stage.removeChild(markerRef.current);
    const triangle = new Graphics();
    const size = 10;
    const angle = Math.atan2(direction.y - center.y, direction.x - center.x);
    const tip = { x: center.x + Math.cos(angle) * size, y: center.y + Math.sin(angle) * size };
    const left = { x: center.x + Math.cos(angle + Math.PI * 2/3) * size, y: center.y + Math.sin(angle + Math.PI * 2/3) * size };
    const right = { x: center.x + Math.cos(angle - Math.PI * 2/3) * size, y: center.y + Math.sin(angle - Math.PI * 2/3) * size };
    triangle.beginFill(0x00ff00);
    triangle.moveTo(tip.x, tip.y);
    triangle.lineTo(left.x, left.y);
    triangle.lineTo(right.x, right.y);
    triangle.lineTo(tip.x, tip.y);
    triangle.endFill();
    triangle.lineStyle(2, 0x00ff00);
    triangle.moveTo(tip.x, tip.y);
    triangle.lineTo(left.x, left.y);
    triangle.moveTo(tip.x, tip.y);
    triangle.lineTo(right.x, right.y);
    triangle.lineStyle(2, 0x000000);
    triangle.moveTo(left.x, left.y);
    triangle.lineTo(right.x, right.y);
    app.stage.addChild(triangle);
    markerRef.current = triangle;
  }

  function generateFallbackTrack() {
    if (!centerlineRef.current.length) return null;
    const track = new Graphics();
    track.lineStyle(2, 0x00ff00);
    centerlineRef.current.forEach((p, i) => {
      if (i === 0) track.moveTo(p.x, p.y);
      else track.lineTo(p.x, p.y);
    });
    track.closePath();
    return track;
  }

  const startBackendRace = async () => {
    if (socket.disconnected) await new Promise(resolve => socket.once('connect', resolve));
    const res = await fetch('/api/admin/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pass': '6a2e8819c6fb4c15' },
      body: JSON.stringify({ centerline: centerlineRef.current, startAt: startAtRef.current })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    debugLog('🏁 Race started:', data);
    setErrorMessage('');
  };

  const loadReplay = async (raceId) => {
    const res = await fetch(`/api/race/${raceId}/replay`);
    const { frames } = await res.json();
    debugLog(`🎬 Replay loaded: ${frames.length} frames`);
  };

  function clearDebugVisuals() {
    if (fallbackTrackRef.current) appRef.current.stage.removeChild(fallbackTrackRef.current);
    if (markerRef.current) appRef.current.stage.removeChild(markerRef.current);
  }

  function addDebugVisuals() {
    if (!fallbackTrackRef.current) fallbackTrackRef.current = generateFallbackTrack();
    if (fallbackTrackRef.current) appRef.current.stage.addChild(fallbackTrackRef.current);
    if (centerlineRef.current.length) {
      const idx = centerlineRef.current.indexOf(startAtRef.current);
      drawDebugTriangle(centerlineRef.current[idx], centerlineRef.current[(idx + 1) % centerlineRef.current.length]);
    }
  }

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;
    const app = new Application({ view: canvasRef.current, backgroundColor: 0xd0f0e0, resizeTo: canvasRef.current.parentElement });
    appRef.current = app;
    const { innerBounds, outerBounds } = drawGreyOvalTrack(app, app.view.parentElement);
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
    const bottomCenter = findBottomCenterPoint(centerline);
    startAtRef.current = bottomCenter;
    const idx = centerline.indexOf(bottomCenter);
    drawStartLine(centerline[idx], centerline[(idx + 1) % centerline.length]);

    const pondPoints = generatePondShape(innerBounds.x + 80, innerBounds.y + 100, 120, 80);
    const pond = new Graphics();
    pond.beginFill(0x66ccff);
    pond.moveTo(pondPoints[0].x, pondPoints[0].y);
    pondPoints.forEach(p => pond.lineTo(p.x, p.y));
    pond.endFill();
    app.stage.addChild(pond);
  }, []);

  useEffect(() => {
    fetch('/api/races')
      .then(res => res.json())
      .then(setPastRaces)
      .catch(err => console.error('Failed to fetch past races', err));
  }, []);

  useEffect(() => {
    socket.on('connect', () => debugLog('Connected to race socket'));
    socket.on('race:init', (data) => {
      horsePathsRef.current = {};
      currentPctsRef.current = {};
      horseSpritesRef.current.forEach(sprite => appRef.current.stage.removeChild(sprite));
      horseSpritesRef.current.clear();
      data.horses.forEach((horse, index) => {
        horsePathsRef.current[horse.id] = horse.path;
        const spriteMap = animateHorseSprites(appRef.current, [horse.path], 1.0, index);
        spriteMap.forEach(sprite => horseSpritesRef.current.set(horse.id, sprite));
      });
    });
    socket.on('race:tick', ({ horseId, pct }) => { currentPctsRef.current[horseId] = pct; });
    return () => { socket.off('connect'); socket.off('race:init'); socket.off('race:tick'); };
  }, []);

  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.ticker.add(() => {
      for (const [horseId, sprite] of horseSpritesRef.current.entries()) {
        const path = horsePathsRef.current[horseId];
        const pct = currentPctsRef.current[horseId];
        if (!path || pct == null) continue;
        const pos = interpolatePath(path, pct);
        sprite.position.set(pos.x, pos.y);
      }
    });
  }, []);

  useEffect(() => {
    if (!appRef.current) return;
    if (debugVisible) addDebugVisuals();
    else clearDebugVisuals();
  }, [debugVisible]);

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-[600px]" />
      <div className="mt-4 space-x-2">
        <button onClick={startBackendRace} className="bg-blue-600 px-4 py-2 text-white rounded">Start Backend Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Debug Visual</button>
        {pastRaces.length > 0 && (
          <select
            className="bg-white border border-gray-300 px-4 py-2 rounded"
            value={selectedRaceId || ''}
            onChange={e => { setSelectedRaceId(e.target.value); loadReplay(e.target.value); }}
          >
            <option value="" disabled>Select a replay</option>
            {pastRaces.map(r => (
              <option key={r.raceId} value={r.raceId}>{r.name || `Race ${r.raceId}`}</option>
            ))}
          </select>
        )}
        {errorMessage && (
          <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
        )}
      </div>
    </div>
  );
};

export default RaceTrack;
