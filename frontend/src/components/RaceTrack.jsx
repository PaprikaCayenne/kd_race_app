// File: frontend/src/components/RaceTrack.jsx
// Version: v3.2.0 — Adds polling for leaderboard every 5s for projector
// Date: 2025-05-30

import React, { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { initRaceListeners } from './track/initRaceListeners';
import { getSpriteDimensions } from '@/utils/spriteDimensionCache';
import LeaderboardOverlay from './track/LeaderboardOverlay';
import HorseRankingOverlay from './track/HorseRankingOverlay';

const VERSION = 'v3.2.0';
const socket = io('/race', { path: '/api/socket.io' });

const TRACK_WIDTH = window.innerWidth;
const TRACK_PADDING = 10;
const TRACK_HEIGHT = 900;
const CANVAS_HEIGHT = TRACK_HEIGHT + TRACK_PADDING * 2;

const CORNER_RADIUS = 200;
const LANE_COUNT = 4;
const HORSE_PADDING = 0;
const BOUNDARY_PADDING = 0;
const START_LINE_OFFSET = 10;
const RACE_DURATION_SECONDS = 180;

const RaceTrack = ({ setRaceName, setRaceWarnings }) => {
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
  const trackReadyRef = useRef(false);
  const centerlineRef = useRef(null);

  const horsePathsRef = useRef(new Map());
  const horsesRef = useRef([]);
  const finishedHorsesRef = useRef(new Set());
  const usedHorseIdsRef = useRef(new Set());
  const raceInfoRef = useRef(null);

  const startLineRef = useRef(null);
  const finishLineRef = useRef(null);

  const [raceCompleted, setRaceCompleted] = useState(false);
  const [lastFinishedRaceId, setLastFinishedRaceId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveRanking, setLiveRanking] = useState([]);
  const [raceNameDisplay, setRaceNameDisplay] = useState('');

  // 🆕 Poll leaderboard every 5 seconds
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/admin/leaderboard');
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard.slice(0, 5));
        }
      } catch (err) {
        console.error('[KD] ❌ Failed to fetch leaderboard:', err);
      }
    };

    fetchLeaderboard(); // initial
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

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
            getSpriteDimensions(h.saddleHex || '#888888', h.bodyHex || '#a0522d', h.id, app).width
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
          spriteWidth: maxSpriteWidth,
          debug: false,
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
          spriteWidth: maxSpriteWidth,
          startLineOffset: START_LINE_OFFSET
        };

        centerlineRef.current = track.centerline;
        startLineRef.current = track.startLine;
        finishLineRef.current = track.finishLine;

        console.log(
          `[KD] 🎯 centerlineRef set with ${track.centerline?.path?.length || 0} points — ready for race:init`
        );
        trackReadyRef.current = true;
        console.log('[KD] ✅ Track is ready');

        initRaceListeners({
          socket,
          appRef,
          trackReadyRef,
          centerlineRef,
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
          raceInfoRef,
          setRaceName: raceName  => {
            setRaceName(raceName);
            setRaceNameDisplay(raceName);
          },
          setRaceWarnings,
          startLineRef,
          finishLineRef,
          raceDurationSeconds: RACE_DURATION_SECONDS,
          debugVisible: false,
          setRaceCompleted,
          setLastFinishedRaceId,
          setLiveRanking
        });
      });

    return () => {
      if (appRef.current) appRef.current.destroy(true, true);
    };
  }, [setRaceName, setRaceWarnings]);

  return (
    <div ref={containerRef} className="relative w-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px` }}
        className="block w-full"
      />
      <LeaderboardOverlay users={leaderboard} />
      {liveRanking.length > 0 && (
        <HorseRankingOverlay ranking={liveRanking} raceName={raceNameDisplay} />
      )}
    </div>
  );
};

RaceTrack.VERSION = VERSION;
export default RaceTrack;
