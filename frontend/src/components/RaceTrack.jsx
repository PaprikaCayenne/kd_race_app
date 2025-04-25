// File: frontend/src/components/RaceTrack.jsx
// Version: v0.8.61 – Send centerline to backend via /api/admin/start

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { drawGreyOvalTrack } from '@/utils/drawGreyOvalTrack';
import { animateHorseSprites } from '@/utils/animateHorseSprites';
import { generateRoundedRectCenterline } from '@/utils/generateRoundedRectCenterline';
import { generatePondShape } from '@/utils/generatePondShape';
import { io } from 'socket.io-client';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);

const socket = io('/race', {
  path: '/api/socket.io'
});

window.__KD_RACE_APP_VERSION__ = 'v0.8.61';
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

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const horseSpritesRef = useRef(new Map());
  const horsePathsRef = useRef({});
  const currentPctsRef = useRef({});
  const [pastRaces, setPastRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const fallbackTrackRef = useRef(null);
  const centerlineRef = useRef([]);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const container = canvasRef.current.parentElement;
    const app = new Application({
      view: canvasRef.current,
      backgroundColor: 0xd0f0e0,
      resizeTo: container
    });
    appRef.current = app;

    const { innerBounds, outerBounds } = drawGreyOvalTrack(app, container);
    const cornerRadius = 120;
    const segments = 400;
    const midBounds = {
      x: (innerBounds.x + outerBounds.x) / 2,
      y: (innerBounds.y + outerBounds.y) / 2,
      width: (innerBounds.width + outerBounds.width) / 2,
      height: (innerBounds.height + outerBounds.height) / 2
    };
    const centerline = generateRoundedRectCenterline(midBounds, cornerRadius, segments);
    centerlineRef.current = centerline;
    debugLog(`🧭 Centerline generated: ${centerline.length} points`);

    const pondPoints = generatePondShape(innerBounds.x + 80, innerBounds.y + 100, 120, 80);
    const pond = new Graphics();
    pond.beginFill(0x66ccff);
    pond.moveTo(pondPoints[0].x, pondPoints[0].y);
    pondPoints.slice(1).forEach(p => pond.lineTo(p.x, p.y));
    pond.endFill();
    app.stage.addChild(pond);
    debugLog(`🌊 Pond drawn with ${pondPoints.length} points`);

    const centerlineLine = new Graphics();
    centerlineLine.lineStyle(2, 0x00ff00);
    centerlineLine.moveTo(centerline[0].x, centerline[0].y);
    for (let i = 1; i < centerline.length; i++) {
      centerlineLine.lineTo(centerline[i].x, centerline[i].y);
    }
    centerlineLine.closePath();
    fallbackTrackRef.current = centerlineLine;
    if (fallbackVisible) app.stage.addChild(centerlineLine);
  }, [fallbackVisible]);

  useEffect(() => {
    socket.on('connect', () => {
      debugLog('🔌 Connected to race socket');
    });

    socket.on('race:init', (data) => {
      debugLog('🎬 Race init received:', data);
      horsePathsRef.current = {};
      currentPctsRef.current = {};

      if (!appRef.current) return;
      horseSpritesRef.current.forEach(sprite => {
        appRef.current.stage.removeChild(sprite);
      });
      horseSpritesRef.current.clear();

      data.horses.forEach((horse, index) => {
        horsePathsRef.current[horse.id] = horse.path;
        const spriteMap = animateHorseSprites(appRef.current, [horse.path], 1.0, index);
        spriteMap.forEach((sprite) => {
          horseSpritesRef.current.set(horse.id, sprite);
        });

        if (DEBUG) {
          const dots = new Graphics();
          dots.beginFill(0xff0000);
          horse.path.slice(0, 10).forEach(p => dots.drawCircle(p.x, p.y, 2));
          dots.endFill();
          appRef.current.stage.addChild(dots);
        }
      });
    });

    socket.on('race:tick', ({ horseId, pct }) => {
      debugLog(`📦 tick: ${horseId} → ${pct}`);
      currentPctsRef.current[horseId] = pct;
    });

    return () => {
      socket.off('connect');
      socket.off('race:init');
      socket.off('race:tick');
    };
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

  const startBackendRace = async () => {
    if (socket.disconnected) {
      debugLog('⏳ Waiting for socket to connect before starting race...');
      await new Promise((resolve) => socket.once('connect', resolve));
    }

    debugLog('📡 Requesting race from backend...');
    try {
      const res = await fetch('/api/admin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': '6a2e8819c6fb4c15'
        },
        body: JSON.stringify({ centerline: centerlineRef.current })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      debugLog('🏁 Race started from backend:', data);
      setErrorMessage('');
    } catch (err) {
      console.error('❌ Failed to start backend race:', err);
      setErrorMessage('Failed to start race. Please check server logs.');
    }
  };

  const loadReplay = async (raceId) => {
    debugLog('📥 Loading replay for race', raceId);
    const res = await fetch(`/api/race/${raceId}/replay`);
    const { frames } = await res.json();
    debugLog('🎬 Replay loaded:', frames.length, 'frames');
  };

  useEffect(() => {
    fetch('/api/races')
      .then(res => res.json())
      .then(data => setPastRaces(data))
      .catch(err => console.error('Failed to fetch past races', err));
  }, []);

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="block w-full h-64 md:h-[600px]" />
      <div className="mt-4 space-x-2">
        <button
          onClick={startBackendRace}
          className="bg-blue-600 px-4 py-2 text-white rounded"
        >
          Start Backend Race
        </button>
        <button
          onClick={() => {
            if (!appRef.current || !fallbackTrackRef.current) return;
            setFallbackVisible(v => {
              const next = !v;
              if (next) {
                appRef.current.stage.addChild(fallbackTrackRef.current);
              } else {
                appRef.current.stage.removeChild(fallbackTrackRef.current);
              }
              return next;
            });
          }}
          className="bg-gray-600 px-4 py-2 text-white rounded"
        >
          Toggle Static Track
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