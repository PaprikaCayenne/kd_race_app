// File: frontend/src/components/RaceTrack.jsx
// Version: v3.8.0 — Adds tournament pen sync, replay selector on /race, and winner preview handling
// Date: 2026-02-18

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { io } from 'socket.io-client';

import { drawDerbyTrack } from './track/drawTrack';
import { initRaceListeners } from './track/initRaceListeners';
import { getSpriteDimensions } from '@/utils/spriteDimensionCache';
import { horseSpriteDataUri } from '@/utils/horseSpriteSvg';
import HorseSprite from './HorseSprite';
import LeaderboardOverlay from './track/LeaderboardOverlay';
import HorseRankingOverlay from './track/HorseRankingOverlay';
import { playReplay } from '@/utils/playReplay';

const VERSION = 'v3.8.0';
const socket = io('/race', { path: '/api/socket.io' });

const TRACK_PADDING = 24;
const HORIZONTAL_TRACK_PADDING = 80;
const TRACK_HEIGHT = 760;
const CANVAS_HEIGHT = 900;

const CORNER_RADIUS = 200;
const LANE_COUNT = 4;
const HORSE_PADDING = 0;
const BOUNDARY_PADDING = 0;
const START_LINE_OFFSET = 0;
const RACE_DURATION_SECONDS = 36;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function layoutPanels(infieldBounds) {
  if (!infieldBounds) return null;

  const pad = 12;
  const gap = clamp(Math.round(infieldBounds.width * 0.025), 10, 22);
  const usableWidth = Math.max(240, infieldBounds.width - pad * 2 - gap * 2);
  const colWidth = Math.max(140, Math.floor(usableWidth / 3));
  const panelHeight = Math.max(120, infieldBounds.height - pad * 2);
  const top = Math.round(infieldBounds.y + pad);
  const left = Math.round(infieldBounds.x + pad);

  return {
    leaderboard: {
      left,
      top,
      width: colWidth,
      maxHeight: panelHeight,
      overflowY: 'auto'
    },
    winner: {
      left: left + colWidth + gap,
      top,
      width: colWidth,
      maxHeight: panelHeight,
      overflow: 'hidden'
    },
    race: {
      left: left + (colWidth + gap) * 2,
      top,
      width: colWidth,
      maxHeight: panelHeight,
      overflowY: 'auto'
    }
  };
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
  const [currentRaceId, setCurrentRaceId] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [replayMode, setReplayMode] = useState(false);
  const [replaySummary, setReplaySummary] = useState(null);
  const [layoutBounds, setLayoutBounds] = useState(null);
  const [session, setSession] = useState(null);

  const selectedReplayRaceId = session?.state === 'replaying'
    ? session?.selectedReplayRaceId || null
    : null;

  const panelStyles = useMemo(() => layoutPanels(layoutBounds?.infieldBounds), [layoutBounds]);

  useEffect(() => {
    socket.emit('session:request-init');

    const onSession = ({ session: nextSession }) => {
      setSession(nextSession || null);
      const activeReplay = Boolean(nextSession?.state === 'replaying' && nextSession?.selectedReplayRaceId);
      setReplayMode(activeReplay);
      if (!activeReplay) {
        setReplaySummary(null);
      }
    };

    const onRaceSummary = ({ summary }) => {
      if (!summary?.winningHorseName) return;
      const canonicalWinner = {
        raceId: summary.raceId,
        bettorName: summary.topLoonWinner?.name || 'No winning bets',
        winnings: summary.topLoonWinner?.loons || 0,
        horseName: summary.winningHorseName,
        horseImage: horseSpriteDataUri(summary.winningHorseBodyHex, summary.winningHorseSaddleHex),
        bodyHex: summary.winningHorseBodyHex,
        saddleHex: summary.winningHorseSaddleHex
      };
      setWinner(canonicalWinner);
      setWinnerHistory((prev) => {
        if (prev.some((item) => item.raceId === canonicalWinner.raceId)) return prev;
        return [...prev, canonicalWinner];
      });
    };

    const onOrder = ({ ranking }) => {
      if (!Array.isArray(ranking)) return;
      setLiveRanking(ranking.map((h) => ({
        id: h.id,
        name: h.name,
        saddleHex: h.saddleHex,
        bodyHex: h.bodyHex
      })));
    };

    const onLeaderboardUpdated = async () => {
      try {
        const res = await fetch('/api/admin/leaderboard');
        const data = await res.json();
        if (data.success) setLeaderboard((data.leaderboard || []).slice(0, 5));
      } catch (err) {
        console.error('[KD] ❌ Failed leaderboard refresh:', err);
      }
    };

    socket.on('session:init', onSession);
    socket.on('session:update', onSession);
    socket.on('race:order', onOrder);
    socket.on('race:summary', onRaceSummary);
    socket.on('leaderboard:updated', onLeaderboardUpdated);

    return () => {
      socket.off('session:init', onSession);
      socket.off('session:update', onSession);
      socket.off('race:order', onOrder);
      socket.off('race:summary', onRaceSummary);
      socket.off('leaderboard:updated', onLeaderboardUpdated);
    };
  }, []);

  useEffect(() => {
    if (!raceCompleted) return;

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

  useEffect(() => {
    const fetchTournamentState = async () => {
      try {
        const res = await fetch('/api/admin/tournament-state');
        const data = await res.json();
        if (data?.success) {
          setAllHorses(Array.isArray(data.horsePool) ? data.horsePool : []);
          const winners = Array.isArray(data.winners) ? data.winners : [];
          if (winners.length > 0) {
            setWinnerHistory(winners.map((horse, idx) => ({
              raceId: `winner-${idx}`,
              horseName: horse.name,
              horseImage: horseSpriteDataUri(horse.bodyHex, horse.saddleHex),
              bodyHex: horse.bodyHex,
              saddleHex: horse.saddleHex,
              bettorName: 'Heat Winner'
            })));
          }
          return;
        }
      } catch {
      }

      try {
        const res = await fetch('/api/horses');
        const horses = await res.json();
        setAllHorses(Array.isArray(horses) ? horses : []);
      } catch (err) {
        console.error('[KD] ❌ Failed to fetch horses:', err);
      }
    };

    fetchTournamentState();
    const interval = setInterval(fetchTournamentState, 4000);
    return () => clearInterval(interval);
  }, [lastFinishedRaceId]);

  useEffect(() => {
    const fetchCurrentRace = async () => {
      try {
        const res = await fetch('/api/race/current');
        const data = await res.json();
        if (data?.exists) {
          setCurrentRaceId(data.id || null);
          setCurrentRaceHorses(Array.isArray(data.horses) ? data.horses : []);
          setCountdownSeconds(Number(data.countdownSeconds) || 0);
        } else {
          setCurrentRaceId(null);
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
      .then((res) => res.json())
      .then(async (horses) => {
        horsesRef.current = horses.slice(0, LANE_COUNT);

        const measuredWidths = await Promise.all(
          horsesRef.current.map((h) =>
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

        setLayoutBounds({
          trackBounds: track.trackBounds,
          infieldBounds: track.infieldBounds,
          penBounds: track.penBounds,
          winnersPenBounds: track.winnersPenBounds
        });

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
          setRaceName: (raceName) => {
            setRaceName(raceName);
            setRaceNameDisplay(raceName);
          },
          setRaceWarnings,
          raceDurationSeconds: RACE_DURATION_SECONDS,
          debugVisible: false,
          setRaceCompleted,
          setLastFinishedRaceId,
          setLiveRanking,
          setWinner
        });
      });

    return () => {
      if (appRef.current) appRef.current.destroy(true, true);
    };
  }, [setRaceName, setRaceWarnings]);

  useEffect(() => {
    if (!selectedReplayRaceId || !trackReadyRef.current || !appRef.current) return;
    if (session?.replayPaused) return;

    const runReplay = async () => {
      try {
        const res = await fetch(`/api/race/${selectedReplayRaceId}/replay`);
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
  }, [selectedReplayRaceId, session?.replayPaused]);

  const racePanelRanking = liveRanking.length > 0
    ? liveRanking
    : currentRaceHorses.map((horse) => ({
        id: horse.id,
        name: horse.name,
        saddleHex: horse.saddleHex,
        bodyHex: horse.bodyHex
      }));

  return (
    <div ref={containerRef} className="relative w-screen overflow-hidden">
      <canvas ref={canvasRef} style={{ height: `${CANVAS_HEIGHT}px` }} className="block w-full" />

      {countdownSeconds > 0 && layoutBounds?.infieldBounds && (
        <div
          className="absolute px-6 py-3 bg-black/70 text-white rounded-xl z-50 text-2xl font-extrabold"
          style={{
            left: layoutBounds.infieldBounds.x + (layoutBounds.infieldBounds.width / 2),
            top: layoutBounds.infieldBounds.y + (layoutBounds.infieldBounds.height / 2),
            transform: 'translate(-50%, -50%)'
          }}
        >
          ⏱️ Race starts in {countdownSeconds}s
        </div>
      )}

      {panelStyles && (
        <LeaderboardOverlay
          users={leaderboard}
          winnerName={winner?.bettorName}
          compact
          panelStyle={panelStyles.leaderboard}
        />
      )}

      {winner && panelStyles && (
        <div className="absolute bg-white/95 p-5 rounded-2xl shadow-2xl border border-yellow-200 z-50 text-center" style={panelStyles.winner}>
          <div className="confetti-wrap" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="confetti-dot"
                style={{
                  '--i': i,
                  '--delay': `${Math.random() * 0.9 + i * 0.04}s`,
                  '--dx': `${Math.round((Math.random() - 0.5) * 140)}px`,
                  '--dy': `${Math.round(-40 - Math.random() * 95)}px`,
                  '--spin': `${Math.round((Math.random() - 0.5) * 360)}deg`,
                  '--size': `${5 + Math.round(Math.random() * 6)}px`
                }}
              />
            ))}
          </div>
          <h3 className="text-xl font-black text-yellow-700">🏆 Winner</h3>
          <p className="text-sm text-gray-600 mt-1">Bettor</p>
          <p className="text-lg font-extrabold text-gray-900 truncate">{winner.bettorName}</p>
          <p className="text-sm text-gray-600 mt-2">Winnings</p>
          <p className="text-lg font-bold text-green-700">{winner.winnings || 0} Lease Loons</p>
          <p className="text-sm text-gray-600 mt-3">Horse</p>
          <p className="text-xl font-bold text-red-700 truncate">{winner.horseName}</p>
          <div className="mt-3 mx-auto w-16 h-16 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center">
            <HorseSprite bodyHex={winner.bodyHex} saddleHex={winner.saddleHex} alt={winner.horseName} className="w-12 h-12" />
          </div>
        </div>
      )}

      {panelStyles && racePanelRanking.length > 0 && (
        <HorseRankingOverlay ranking={racePanelRanking} raceName={raceNameDisplay || 'Current Race'} panelStyle={panelStyles.race} />
      )}

      {layoutBounds?.penBounds && (
        <div
          className="absolute pen-surface rounded-xl p-3 shadow-xl z-40"
          style={{
            left: layoutBounds.penBounds.x,
            top: layoutBounds.penBounds.y,
            width: layoutBounds.penBounds.width,
            height: layoutBounds.penBounds.height,
            overflowY: 'auto'
          }}
        >
          <h4 className="font-bold text-sm mb-2">🐎 Horse Pen (Tournament Horses)</h4>
          <div className="flex flex-wrap gap-2">
            {allHorses.map((horse) => (
              <div key={horse.id} className="horse-chip" title={horse.name}>
                <HorseSprite bodyHex={horse.bodyHex} saddleHex={horse.saddleHex} alt={horse.name} className="w-8 h-8" />
                <span className="text-[10px] leading-tight max-w-20 truncate">{horse.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {panelStyles && replayMode && (
        <div className="absolute bg-white/90 rounded-xl p-3 shadow z-50" style={{ ...panelStyles.race, top: panelStyles.race.top + 8 }}>
          <h4 className="font-bold text-sm">Replay Active</h4>
          <p className="text-xs text-gray-700 mt-1">
            Admin is controlling replay for race #{selectedReplayRaceId || '—'}.
          </p>
          {session?.replayPaused && (
            <p className="text-xs text-amber-700 mt-2 font-semibold">Replay paused</p>
          )}
        </div>
      )}

      {replayMode && replaySummary?.winner && panelStyles && (
        <div className="absolute bg-white/95 rounded-2xl shadow-2xl p-4 z-50" style={panelStyles.winner}>
          <h4 className="font-bold text-center text-lg">Replay Winner</h4>
          <div className="flex items-center justify-center gap-3 mt-2">
            <HorseSprite
              bodyHex={replaySummary.winner.bodyHex}
              saddleHex={replaySummary.winner.saddleHex}
              alt={replaySummary.winner.horseName}
              className="w-10 h-10"
            />
            <span className="font-semibold truncate">{replaySummary.winner.horseName}</span>
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

      {layoutBounds?.winnersPenBounds && (
        <div
          className="absolute winners-pen-surface rounded-xl p-3 shadow-xl z-40"
          style={{
            left: layoutBounds.winnersPenBounds.x,
            top: layoutBounds.winnersPenBounds.y,
            width: layoutBounds.winnersPenBounds.width,
            height: layoutBounds.winnersPenBounds.height,
            overflowY: 'auto'
          }}
        >
          <h4 className="font-bold text-sm mb-2">🏅 Winners Pen</h4>
          <div className="flex flex-wrap gap-2">
            {winnerHistory.length === 0 && <p className="text-xs text-gray-500">No winners yet.</p>}
            {winnerHistory.map((w, idx) => (
              <div key={`${w.raceId || w.horseName}-${idx}`} className="winner-chip" title={`${w.horseName} (${w.bettorName || 'Heat Winner'})`}>
                <HorseSprite bodyHex={w.bodyHex} saddleHex={w.saddleHex} alt={w.horseName} className="w-8 h-8" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

RaceTrack.VERSION = VERSION;
export default RaceTrack;
