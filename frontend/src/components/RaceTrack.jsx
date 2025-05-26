// File: frontend/src/components/RaceTrack.jsx
// Version: v2.2.2 — Removes padding on outer div for edge-to-edge canvas

import React, { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { toggleDebugLayers } from './track/toggleDebugLayers';
import { triggerGenerateHorses } from './track/triggerGenerateHorses';
import { triggerStartRace } from './track/triggerStartRace';
import { initRaceListeners } from './track/initRaceListeners';
import { updateDebugDots } from './track/updateDebugDots';
import ReplayControls from './ReplayControls';

import { getSpriteDimensions } from '@/utils/spriteDimensionCache';

const VERSION = 'v2.2.2';
const socket = io('/race', { path: '/api/socket.io' });

const TRACK_WIDTH = window.innerWidth;
const TRACK_PADDING = 10;
const TRACK_HEIGHT = 900;
const CANVAS_HEIGHT = TRACK_HEIGHT + TRACK_PADDING * 2;

const CORNER_RADIUS = 200;
const LANE_COUNT = 4;
const HORSE_PADDING = 0;
const BOUNDARY_PADDING = 0;
const START_LINE_OFFSET = 100;
const START_LINE_PADDING = 10;

const SPEED_MULTIPLIER_DEFAULT = 2;

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
  const [speedMultiplier, setSpeedMultiplier] = useState(SPEED_MULTIPLIER_DEFAULT);
  const [replayHistory, setReplayHistory] = useState([]);
  const [replayToPlay, setReplayToPlay] = useState(null);

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
      .then(async horses => {
        horsesRef.current = horses.slice(0, LANE_COUNT);

        const measuredWidths = await Promise.all(
          horsesRef.current.map(h =>
            getSpriteDimensions(h.hex, h.id, app, h.variant || 'bay').width
          )
        );
        const maxSpriteWidth = Math.max(...measuredWidths);
        const laneWidth = maxSpriteWidth + HORSE_PADDING;

        const track = drawDerbyTrack({
          app,
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          cornerRadius: CORNER_RADIUS,
          laneCount: LANE_COUNT,
          laneWidth,
          boundaryPadding: BOUNDARY_PADDING,
          trackPadding: TRACK_PADDING,
          startLineOffset: START_LINE_OFFSET,
          debug: debugVisible,
          horses: horsesRef.current,
          horsePaths: horsePathsRef.current,
          debugDotsRef,
          debugPathLinesRef,
          labelSpritesRef
        });

        if (!track || !track.lanes || !track.centerline) {
          console.error('[KD] ❌ drawDerbyTrack failed:', track);
          return;
        }

        trackDataRef.current = {
          ...track,
          laneCount: LANE_COUNT,
          laneWidth,
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

    if (horsePathsRef.current.size > 0) {
      updateDebugDots({
        horses: horsesRef.current,
        horsePaths: horsePathsRef.current,
        app: appRef.current,
        debugDotsRef,
        debugVisible
      });
    }
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
    const { lanes, centerline, spriteWidth } = trackDataRef.current ?? {};
    if (!lanes || !centerline || !spriteWidth) {
      console.error('[KD] ❌ trackDataRef is incomplete — cannot generate horses');
      return;
    }

    triggerGenerateHorses({
      app: appRef.current,
      trackData: {
        ...trackDataRef.current,
        lanes,
        centerline,
        spriteWidth
      },
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
      speedMultiplier,
      debugVisible
    });

    if (typeof window !== 'undefined' && window.playRace) {
      window.playRace.onReplayReady = (replayData) => {
        setReplayHistory(prev => [...prev, {
          timestamp: Date.now(),
          data: replayData
        }]);
      };
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px` }}
        className="block w-full"
      />
      <div className="mt-4 space-x-2">
        <button onClick={handleGenerate} disabled={!canGenerate} className="bg-blue-600 px-4 py-2 text-white rounded disabled:opacity-50">Generate Horses</button>
        <button onClick={handleStartRace} disabled={!raceReady} className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50">Start Race</button>
        <button onClick={() => setDebugVisible(v => !v)} className="bg-gray-600 px-4 py-2 text-white rounded">Toggle Visuals</button>
        <button onClick={() => setSpeedMultiplier(speedMultiplier === SPEED_MULTIPLIER_DEFAULT ? 4 : SPEED_MULTIPLIER_DEFAULT)} className="bg-purple-600 px-4 py-2 text-white rounded">
          {speedMultiplier === SPEED_MULTIPLIER_DEFAULT ? 'Enable Test Speed' : 'Back to Live Speed'}
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
