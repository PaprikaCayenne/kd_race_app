// File: frontend/src/components/RaceTrack.jsx
// Version: v3.4.0 — Adds race countdown + horse pens + winner history visuals
// Date: 2026-02-18

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { initRaceListeners } from './track/initRaceListeners';
import { getSpriteDimensions } from '@/utils/spriteDimensionCache';
import LeaderboardOverlay from './track/LeaderboardOverlay';
import HorseRankingOverlay from './track/HorseRankingOverlay';
import { playReplay } from '@/utils/playReplay';

const VERSION = 'v3.4.0';
const socket = io('/race', { path: '/api/socket.io' });

const TRACK_PADDING = 24;
const HORIZONTAL_TRACK_PADDING = 64;
const TRACK_HEIGHT = 900;
const CANVAS_HEIGHT = TRACK_HEIGHT + TRACK_PADDING * 2;

const CORNER_RADIUS = 200;
const LANE_COUNT = 4;
const HORSE_PADDING = 0;
const BOUNDARY_PADDING = 0;
const START_LINE_OFFSET = 0;
const RACE_DURATION_SECONDS = 180;

function horseIcon(bodyHex = '#a0522d', saddleHex = '#888888') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="18" ry="12" fill="${bodyHex}"/><circle cx="47" cy="28" r="9" fill="${bodyHex}"/><rect x="24" y="29" width="14" height="10" rx="3" fill="${saddleHex}"/><rect x="18" y="44" width="5" height="12" rx="2" fill="#333"/><rect x="35" y="44" width="5" height="12" rx="2" fill="#333"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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

  const [raceCompleted, setRaceCompleted] = useState(false);
  const [lastFinishedRaceId, setLastFinishedRaceId] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveRanking, setLiveRanking] = useState([]);
  const [raceNameDisplay, setRaceNameDisplay] = useState('');
  const [winner, setWinner] = useState(null);
  const [winnerHistory, setWinnerHistory] = useState([]);
  const [allHorses, setAllHorses] = useState([]);
  const [currentRaceHorses, setCurrentRaceHorses] = useState([]);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [replayMode, setReplayMode] = useState(false);
  const [replaySummary, setReplaySummary] = useState(null);
  const [pastRaces, setPastRaces] = useState([]);

  useEffect(() => {
    if (!raceCompleted) {
      setWinner(null);
      return;
    }

    const fetchWinner = async () => {
      try {
        const res = await fetch('/api/race/latest-winner');
        const data = await res.json();
        if (data?.success && data.winner) {
          setWinner(data.winner);
          setWinnerHistory((prev) => {
            if (prev.some((item) => item.raceId === data.winner.raceId)) return prev;
            return [...prev, data.winner];
          });
        }
      } catch (err) {
        console.error('[KD] ❌ Failed to fetch latest winner:', err);
      }
    };

    fetchWinner();
  }, [raceCompleted, lastFinishedRaceId]);

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

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const replayRaceId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('replayRaceId');
  }, []);

  useEffect(() => {
    const fetchPastRaces = async () => {
      try {
        const res = await fetch('/api/race/races');
        const data = await res.json();
        setPastRaces(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[KD] ❌ Failed to fetch races for replay:', err);
      }
    };

    fetchPastRaces();
  }, [lastFinishedRaceId]);

  useEffect(() => {
    const fetchCurrentRace = async () => {
      try {
        const res = await fetch('/api/race/current');
        const data = await res.json();
        if (data?.exists) {
          setCurrentRaceHorses(Array.isArray(data.horses) ? data.horses : []);
          setCountdownSeconds(Number(data.countdownSeconds) || 0);
        } else {
          setCurrentRaceHorses([]);
          setCountdownSeconds(0);
        }
      } catch (err) {
        console.error('[KD] ❌ Failed to fetch race countdown state:', err);
      }
    };

    fetchCurrentRace();
    const timer = setInterval(fetchCurrentRace, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;

    const app = new Application({
      view: canvasRef.current,
      backgroundColor: 0xbaf0ba,
      width: containerWidth,
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
        setAllHorses(horses);
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
          width: containerWidth,
          height: TRACK_HEIGHT,
          cornerRadius: CORNER_RADIUS,
          laneCount: LANE_COUNT,
          laneWidth,
          boundaryPadding: BOUNDARY_PADDING,
          trackPadding: TRACK_PADDING,
          horizontalPadding: HORIZONTAL_TRACK_PADDING,
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
        trackReadyRef.current = true;

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
          setRaceName: raceName => {
            setRaceName(raceName);
            setRaceNameDisplay(raceName);
          },
          setRaceWarnings,
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


  useEffect(() => {
    if (!replayRaceId || !trackReadyRef.current || !appRef.current) return;

    const runReplay = async () => {
      try {
        const res = await fetch(`/api/race/${replayRaceId}/replay`);
        const data = await res.json();
        if (!Array.isArray(data?.horses) || !Array.isArray(data?.frames)) return;

        setReplayMode(true);
        setReplaySummary({ winner: data.winner, loonWinners: data.loonWinners || [] });

        const replayHorses = data.horses.slice(0, 4);
        const replayData = {};

        replayHorses.forEach((horse) => {
          const path = horsePathsRef.current.get(horse.localId);
          if (!path) return;
          replayData[horse.localId] = data.frames
            .filter((f) => f.horseId === horse.id)
            .map((f) => ({ time: f.timeMs, distance: Math.max(0, Math.min(1, f.pct)) * path.arcLength }));
        });

        playReplay({
          app: appRef.current,
          horseSprites: horseSpritesRef.current,
          labelSprites: labelSpritesRef.current,
          horsePaths: horsePathsRef.current,
          replayData
        });
      } catch (err) {
        console.error('[KD] ❌ Failed to run replay:', err);
      }
    };

    runReplay();
  }, [replayRaceId]);

  return (
    <div ref={containerRef} className="relative w-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px` }}
        className="block w-full"
      />

      {countdownSeconds > 0 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/70 text-white rounded-xl z-50 text-2xl font-extrabold">
          ⏱️ Race starts in {countdownSeconds}s
        </div>
      )}

      <LeaderboardOverlay users={leaderboard} winnerName={winner?.bettorName} />

      {winner && (
        <div className="absolute top-60 left-1/2 -translate-x-1/2 w-80 bg-white/95 p-5 rounded-2xl shadow-2xl border border-yellow-200 z-50 text-center">
          <div className="confetti-wrap" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="confetti-dot" style={{ '--i': i, '--delay': `${i * 0.12}s` }} />
            ))}
          </div>
          <h3 className="text-xl font-black text-yellow-700">🏆 Winner</h3>
          <p className="text-sm text-gray-600 mt-1">Bettor</p>
          <p className="text-lg font-extrabold text-gray-900">{winner.bettorName}</p>
          <p className="text-sm text-gray-600 mt-2">Winnings</p>
          <p className="text-lg font-bold text-green-700">{winner.winnings || 0} Lease Loons</p>
          <p className="text-sm text-gray-600 mt-3">Horse</p>
          <p className="text-xl font-bold text-red-700">{winner.horseName}</p>
          <div className="mt-3 mx-auto w-16 h-16 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center">
            <img src={winner.horseImage} alt={winner.horseName} className="w-12 h-12" />
          </div>
        </div>
      )}

      {liveRanking.length > 0 && (
        <HorseRankingOverlay ranking={liveRanking} raceName={raceNameDisplay} />
      )}

      <div className="absolute bottom-4 left-4 w-72 bg-white/90 rounded-xl p-3 shadow-xl z-40">
        <h4 className="font-bold text-sm mb-2">🐎 Horse Pen (Tournament Horses)</h4>
        <div className="flex flex-wrap gap-2">
          {allHorses.map((horse) => (
            <div
              key={horse.id}
              className="horse-chip"
              title={horse.name}
            >
              <img src={horseIcon(horse.bodyHex, horse.saddleHex)} alt={horse.name} className="w-8 h-8" />
              <span className="text-[10px] leading-tight max-w-20 truncate">{horse.name}</span>
            </div>
          ))}
        </div>
      </div>


      <div className="absolute top-4 right-4 bg-white/90 rounded-xl p-3 shadow z-50 w-64">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm">Replays</h4>
          {replayMode && (
            <button
              type="button"
              onClick={() => {
                const next = new URL(window.location.href);
                next.searchParams.delete('replayRaceId');
                window.location.href = next.toString();
              }}
              className="text-xs px-2 py-1 rounded bg-orange-500 text-white"
            >
              Clear Replay
            </button>
          )}
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {pastRaces.slice(0, 8).map((race) => (
            <button
              key={race.id}
              type="button"
              className="w-full text-left text-xs hover:bg-gray-100 px-2 py-1 rounded"
              onClick={() => {
                const next = new URL(window.location.href);
                next.searchParams.set('replayRaceId', race.id);
                window.location.href = next.toString();
              }}
            >
              Replay Race #{race.raceNumber || race.id}
            </button>
          ))}
        </div>
      </div>

      {replayMode && replaySummary?.winner && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-white/95 rounded-2xl shadow-2xl p-4 z-50 min-w-80">
          <h4 className="font-bold text-center text-lg">Replay Winner</h4>
          <div className="flex items-center justify-center gap-3 mt-2">
            <img src={horseIcon(replaySummary.winner.bodyHex, replaySummary.winner.saddleHex)} alt={replaySummary.winner.horseName} className="w-10 h-10" />
            <span className="font-semibold">{replaySummary.winner.horseName}</span>
          </div>
          <ul className="mt-3 text-sm">
            {(replaySummary.loonWinners || []).slice(0, 5).map((entry, idx) => (
              <li key={`${entry.name}-${idx}`} className={idx === 0 ? 'font-bold text-red-700' : ''}>
                {entry.name}: {entry.loons}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="absolute bottom-4 right-4 w-72 bg-white/90 rounded-xl p-3 shadow-xl z-40">
        <h4 className="font-bold text-sm mb-2">🏅 Winners Pen</h4>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {winnerHistory.length === 0 && <p className="text-xs text-gray-500">No winners yet.</p>}
          {winnerHistory.map((w) => (
            <div key={w.raceId} className="winner-chip" title={`${w.horseName} (${w.bettorName})`}>
              <img src={w.horseImage || horseIcon(w.bodyHex, w.saddleHex)} alt={w.horseName} className="w-8 h-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

RaceTrack.VERSION = VERSION;
export default RaceTrack;
