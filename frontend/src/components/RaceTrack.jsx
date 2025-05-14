// File: frontend/src/components/RaceTrack.jsx
// Version: v1.6.4 — Passes all debug and path refs to triggerGenerateHorses

import React, { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { toggleDebugLayers } from './track/toggleDebugLayers';
import { triggerGenerateHorses } from './track/triggerGenerateHorses';
import { triggerStartRace } from './track/triggerStartRace';
import { initRaceListeners } from './track/initRaceListeners';
import { logInfo } from './track/debugConsole';
import ReplayControls from './ReplayControls';

const VERSION = 'v1.6.4';
const socket = io('/race', { path: '/api/socket.io' });
const canvasHeight = 800;
const startAtPercent = 0.55;

const TRACK_WIDTH = window.innerWidth - 200;
const TRACK_HEIGHT = 600;
const CORNER_RADIUS = 200;
const LANE_WIDTH = 30;
const LANE_COUNT = 4;

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
  const horsePathsRef = useRef({});
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
      height: canvasHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    app.stage.sortableChildren = true;
    appRef.current = app;

    const { lanes, centerline } = drawDerbyTrack({
      app,
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      cornerRadius: CORNER_RADIUS,
      laneWidth: LANE_WIDTH,
      laneCount: LANE_COUNT,
      debug: debugVisible
    });

    lanesRef.current = lanes;
    centerlineRef.current = centerline;
    trackDataRef.current = { lanes, centerline, laneWidth: LANE_WIDTH, laneCount: LANE_COUNT };

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
      debugVisible,
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
      <canvas ref={canvasRef} className="block w-full h-[800px]" />
      <div className="mt-4 space-x-2">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="bg-blue-600 px-4 py-2 text-white rounded disabled:opacity-50"
        >
          Generate Horses
        </button>
        <button
          onClick={handleStartRace}
          disabled={!raceReady}
          className="bg-green-600 px-4 py-2 text-white rounded disabled:opacity-50"
        >
          Start Race
        </button>
        <button
          onClick={() => setDebugVisible(v => !v)}
          className="bg-gray-600 px-4 py-2 text-white rounded"
        >
          Toggle Visuals
        </button>
        <button
          onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 4 : 1)}
          className="bg-purple-600 px-4 py-2 text-white rounded"
        >
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
