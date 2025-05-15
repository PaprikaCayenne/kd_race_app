// File: frontend/src/components/RaceTrack.jsx
// Version: v1.8.7 — Fixes canvas height override by Tailwind; binds height from TRACK_HEIGHT + padding

import React, { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { toggleDebugLayers } from './track/toggleDebugLayers';
import { triggerGenerateHorses } from './track/triggerGenerateHorses';
import { triggerStartRace } from './track/triggerStartRace';
import { initRaceListeners } from './track/initRaceListeners';
import ReplayControls from './ReplayControls';

import { getSpriteDimensions } from '@/utils/spriteDimensionCache';

const VERSION = 'v1.8.7';
const socket = io('/race', { path: '/api/socket.io' });

// Layout constants
const TRACK_WIDTH = window.innerWidth;
const TRACK_PADDING = 60; // Vertical padding above/below the track
const TRACK_HEIGHT = 600; // The track's actual height (not full canvas)
const CANVAS_HEIGHT = TRACK_HEIGHT + TRACK_PADDING * 2;

const CORNER_RADIUS = 200;
const LANE_COUNT = 4;
const HORSE_PADDING = 5;
const BOUNDARY_PADDING = 1;
const startAtPercent = .12;

const RaceTrack = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const appRef = useRef(null);

  const horseSpritesRef = useRef(new Map());
  const labelSpritesRef = useRef(new Map());
  const debugDotsRef = useRef([]);
  const debugPathLinesRef = useRef([]);
  const finishDotsRef = useRef([]);
  const startDotsRef = useRef([]);

  const trackDataRef = useRef(null);
  const horsePathsRef = useRef(new Map());
  const horsesRef = useRef([]);
  const finishedHorsesRef = useRef(new Set());
  const usedHorseIdsRef = useRef(new Set());

  const [debugVisible, setDebugVisible] = useState(false);
  const [raceReady, setRaceReady] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [replayHistory, setReplayHistory] = useState([]);
  const [replayToPlay, setReplayToPlay] = useState(null);

  const lanesRef = useRef(null);
  const centerlineRef = useRef(null);

  useEffect(() => {
    const app = new Application({
      view: canvasRef.current,
      backgroundColor: 0xbaf0ba,
      width: containerRef.current.offsetWidth,
      height: CANVAS_HEIGHT,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    app.stage.sortableChildren = true;
    app.start();
    appRef.current = app;

    fetch('/api/horses')
      .then(res => res.json())
      .then(horses => {
        horsesRef.current = horses.slice(0, LANE_COUNT);

        const measuredWidths = horsesRef.current.map(h =>
          getSpriteDimensions(h.color, h.id, app).width
        );
        const maxSpriteWidth = Math.max(...measuredWidths);
        const laneWidth = maxSpriteWidth + HORSE_PADDING;

        const { lanes, centerline } = drawDerbyTrack({
          app,
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          cornerRadius: CORNER_RADIUS,
          laneCount: LANE_COUNT,
          laneWidth,
          boundaryPadding: BOUNDARY_PADDING,
          trackPadding: TRACK_PADDING,
          startAtPercent, // ⬅️ add this
          debug: debugVisible
        });

        lanesRef.current = lanes;
        centerlineRef.current = centerline;
        trackDataRef.current = {
          lanes,
          centerline,
          laneWidth,
          laneCount: LANE_COUNT,
          spriteWidth: maxSpriteWidth
        };

        initRaceListeners({
          socket,
          appRef,
          horseSpritesRef,
          labelSpritesRef,
          debugDotsRef,
          debugPathLinesRef,
          finishDotsRef,
          startDotsRef,
          trackDataRef,
          horsePathsRef,
          horsesRef,
          finishedHorsesRef,
          usedHorseIdsRef,
          setRaceReady,
          setCanGenerate,
          debugVisible
        });
      });
  }, []);

  useEffect(() => {
    toggleDebugLayers({
      app: appRef.current,
      debugVisible,
      debugDotsRef,
      debugPathLinesRef,
      startDotsRef,
      finishDotsRef,
      labelSpritesRef
    });
  }, [debugVisible]);

  useEffect(() => {
    if (!replayToPlay || !appRef.current) return;

    import('../utils/playReplay').then(({ playReplay }) => {
      playReplay({
        app: appRef.current,
        horseSprites: horseSpritesRef.current,
        labelSprites: labelSpritesRef.current,
        horsePaths: horsePathsRef.current,
        replayData: replayToPlay.data
      });
    });
  }, [replayToPlay]);

  const handleGenerate = () => {
    triggerGenerateHorses({
      app: appRef.current,
      trackData: trackDataRef.current,
      horsesRef,
      horseSpritesRef,
      labelSpritesRef,
      finishedHorsesRef,
      debugPathLinesRef,
      debugDotsRef,
      finishDotsRef,
      startDotsRef,
      horsePathsRef,
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      startAtPercent,
      setRaceReady,
      setCanGenerate,
      usedHorseIdsRef,
      debugVisible
    });
  };

  const handleStartRace = () => {
    triggerStartRace({
      appRef,
      horsesRef,
      horsePathsRef,
      horseSpritesRef,
      labelSpritesRef,
      finishedHorsesRef,
      debugPathLinesRef,
      finishDotsRef,
      setRaceReady,
      setCanGenerate,
      speedMultiplier
    });

    if (typeof window !== 'undefined' && window.playRace) {
      window.playRace.onReplayReady = (replayData) => {
        const newReplay = {
          timestamp: Date.now(),
          data: replayData
        };
        setReplayHistory(prev => [...prev, newReplay]);
      };
    }
  };

  return (
    <div ref={containerRef} className="p-4 relative">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px` }}
        className="block w-full"
      />
      <div className="mt-4 space-x-2">
        <button onClick={handleGenerate} disabled={!canGenerate} className="bg-blue-600 px-4 py-2 text-white rounded disabled:opacity-50">Generate Horses</button>
        <button onClick={handleStartRace} disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Visuals</button>
        <button onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 4 : 1)} className="bg-purple-600 px-4 py-2 text-white rounded">
          {speedMultiplier === 1 ? 'Enable Test Speed' : 'Back to Live Speed'}
        </button>
      </div>
      <ReplayControls
        replays={replayHistory}
        onReplaySelect={(replay) => {
          console.log('[KD] 🎬 Playing saved replay', replay);
          setReplayToPlay(replay);
        }}
      />
    </div>
  );
};

RaceTrack.VERSION = VERSION;
export default RaceTrack;
