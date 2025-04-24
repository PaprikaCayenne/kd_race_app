// File: frontend/src/components/RaceTrack.jsx
// Version: v0.8.42 – Disable fallback horses for now, retain toggle UI and structure

import React, { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { drawGreyOvalTrack } from '@/utils/drawGreyOvalTrack';
import { drawHorseCenterline } from '@/utils/drawHorseCenterline';
import { animateHorseSprites } from '@/utils/animateHorseSprites';
import { generateAllLanes } from '@/utils/generateOffsetLane';
import { generateRoundedRectCenterline } from '@/utils/generateRoundedRectCenterline';
import { generatePondShape } from '@/utils/generatePondShape';

const DEBUG = true;
const debugLog = (...args) => DEBUG && console.log('[KD]', ...args);

window.__KD_RACE_APP_VERSION__ = 'v0.8.42';
console.log('[KD] 🔢 Frontend version:', window.__KD_RACE_APP_VERSION__);

const RaceTrack = () => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const fallbackHorseSprites = useRef([]);
  const [fallbackVisible, setFallbackVisible] = useState(false); // Disabled by default
  const [pastRaces, setPastRaces] = useState([]);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const renderFallbackHorses = (app, centerline, laneWidth) => {
    const lanes = generateAllLanes(centerline, 4, laneWidth);
    debugLog('🧪 Fallback lanes:', lanes);
    fallbackHorseSprites.current = lanes.map((lane, index) => {
      debugLog(`  Lane ${index} has ${lane.length} points`);
      return animateHorseSprites(app, [lane], 1.0, index);
    });
  };

  const clearFallbackHorses = () => {
    if (!appRef.current) return;
    fallbackHorseSprites.current.forEach((spriteMap) => {
      for (const sprite of spriteMap.values()) {
        debugLog('❌ Removing fallback sprite');
        appRef.current.stage.removeChild(sprite);
      }
    });
    fallbackHorseSprites.current = [];
  };

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
    const centerline = generateRoundedRectCenterline(innerBounds, cornerRadius, segments);
    debugLog(`🧭 Centerline generated: ${centerline.length} points`);

    drawHorseCenterline(app, centerline);

    const trackThickness = (outerBounds.width - innerBounds.width) / 2;
    const maxLaneWidth = (trackThickness - 20) / 2;
    const laneWidth = Math.min(30, maxLaneWidth);
    debugLog(`📏 Lane width adjusted: ${laneWidth}px`);

    if (fallbackVisible) {
      renderFallbackHorses(app, centerline, laneWidth);
    }

    const pondPoints = generatePondShape(innerBounds.x + 80, innerBounds.y + 100, 120, 80);
    const pond = new Graphics();
    pond.beginFill(0x66ccff);
    pond.moveTo(pondPoints[0].x, pondPoints[0].y);
    pondPoints.slice(1).forEach(p => pond.lineTo(p.x, p.y));
    pond.endFill();
    app.stage.addChild(pond);
    debugLog(`🌊 Pond drawn with ${pondPoints.length} points`);
  }, []);

  useEffect(() => {
    if (!appRef.current) return;
    if (fallbackVisible) {
      const { innerBounds, outerBounds } = drawGreyOvalTrack(appRef.current, canvasRef.current.parentElement);
      const cornerRadius = 120;
      const segments = 400;
      const centerline = generateRoundedRectCenterline(innerBounds, cornerRadius, segments);
      const trackThickness = (outerBounds.width - innerBounds.width) / 2;
      const maxLaneWidth = (trackThickness - 20) / 2;
      const laneWidth = Math.min(30, maxLaneWidth);
      renderFallbackHorses(appRef.current, centerline, laneWidth);
    } else {
      clearFallbackHorses();
    }
  }, [fallbackVisible]);

  const startBackendRace = async () => {
    debugLog('📡 Requesting race from backend...');
    try {
      const res = await fetch('/api/admin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': '2199213879'
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      debugLog('🏁 Race started from backend:', data);
      setFallbackVisible(false);
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
          onClick={() => setFallbackVisible(!fallbackVisible)}
          className="bg-green-600 px-4 py-2 text-white rounded"
        >
          Toggle Fallback Horses
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
