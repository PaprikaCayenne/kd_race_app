// File: frontend/src/pages/users/DashboardPage.jsx
// Version: v1.8.0 — Stabilizes bet tiles, reorders dashboard sections, and adds past-heat winner history
// Date: 2026-02-19

import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import HorseBetTile from '../../components/HorseBetTile.jsx';
import HorseSprite from '../../components/HorseSprite.jsx';

const raceSocket = io('/race', { path: '/api/socket.io' });

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function getDeviceId() {
  let id = localStorage.getItem('deviceId') || getCookie('deviceId');
  if (!id) id = crypto.randomUUID();
  localStorage.setItem('deviceId', id);
  document.cookie = `deviceId=${id}; path=/; max-age=31536000`;
  return id;
}

export default function DashboardPage() {
  const [deviceId] = useState(getDeviceId());
  const [user, setUser] = useState(null);
  const [race, setRace] = useState({ horses: [] });
  const [bets, setBets] = useState({});
  const [balance, setBalance] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [checkingUser, setCheckingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rank, setRank] = useState(null);
  const [latestWinner, setLatestWinner] = useState(null);
  const [winnerHistory, setWinnerHistory] = useState([]);
  const [liveOrder, setLiveOrder] = useState([]);
  const [replayOrder, setReplayOrder] = useState([]);
  const [session, setSession] = useState(null);

  const initializedBetsRef = useRef(false);

  const refreshLeaderboard = useCallback(async (knownUserId = null) => {
    const leaderboardRes = await axios.get('/api/leaderboard');
    const leaderboardData = leaderboardRes?.data?.leaderboard || [];
    setLeaderboard(leaderboardData);

    const targetUserId = knownUserId ?? user?.id;
    if (targetUserId != null) {
      const userRank = leaderboardData.findIndex((u) => u.id === targetUserId);
      if (userRank >= 0) setRank(userRank + 1);
    }
  }, [user?.id]);

  useEffect(() => {
    raceSocket.emit('session:request-init');

    const onSession = ({ session: nextSession }) => {
      setSession(nextSession || null);
      if (nextSession?.state !== 'replaying') {
        setReplayOrder([]);
      }
    };

    const onOrder = ({ ranking }) => {
      if (!Array.isArray(ranking)) return;
      setLiveOrder(ranking);
    };

    const onReplayTick = ({ ranking }) => {
      if (!Array.isArray(ranking)) return;
      setReplayOrder(ranking);
    };

    const onLeaderboardUpdate = () => {
      refreshLeaderboard().catch((err) => console.error('Failed to refresh leaderboard:', err));
    };

    raceSocket.on('session:init', onSession);
    raceSocket.on('session:update', onSession);
    raceSocket.on('race:order', onOrder);
    raceSocket.on('replay:tick', onReplayTick);
    raceSocket.on('leaderboard:updated', onLeaderboardUpdate);

    return () => {
      raceSocket.off('session:init', onSession);
      raceSocket.off('session:update', onSession);
      raceSocket.off('race:order', onOrder);
      raceSocket.off('replay:tick', onReplayTick);
      raceSocket.off('leaderboard:updated', onLeaderboardUpdate);
    };
  }, [refreshLeaderboard]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, raceRes, winnerRes, sessionRes, racesRes] = await Promise.allSettled([
          axios.get(`/api/user/${deviceId}`),
          axios.get('/api/race/current'),
          axios.get('/api/race/latest-winner'),
          axios.get('/api/race/session'),
          axios.get('/api/race/races')
        ]);

        if (userRes.status === 'fulfilled') {
          setUser(userRes.value.data);
          setBalance(userRes.value.data.leaseLoons);

          if (!initializedBetsRef.current) {
            const initialBets = {};
            if (userRes.value.data.bets?.length) {
              userRes.value.data.bets.forEach((bet) => {
                initialBets[bet.horseId] = bet.amount;
              });
            }
            setBets(initialBets);
            initializedBetsRef.current = true;
          }

          await refreshLeaderboard(userRes.value.data.id);
        } else {
          setUser(null);
        }

        if (raceRes.status === 'fulfilled') {
          const raceData = raceRes.value.data || { horses: [] };
          setRace(raceData);
          setCountdown(raceData.countdownSeconds || 0);
        } else {
          setRace({ horses: [] });
        }

        if (winnerRes.status === 'fulfilled' && winnerRes.value?.data?.winner) {
          setLatestWinner(winnerRes.value.data.winner);
        }

        if (sessionRes.status === 'fulfilled' && sessionRes.value?.data?.session) {
          setSession(sessionRes.value.data.session);
        }

        if (racesRes.status === 'fulfilled' && Array.isArray(racesRes.value?.data)) {
          const history = racesRes.value.data.map((raceRow) => {
            const top = Array.isArray(raceRow.loonWinners)
              ? raceRow.loonWinners.find((winner) => winner.isTop) || raceRow.loonWinners[0]
              : null;

            return {
              raceId: raceRow.id,
              horseName: raceRow.winningHorse,
              winnerName: top?.name || raceRow.winningPlayer || 'No winning bets',
              loons: top?.loons || 0,
              horseMeta: raceRow.winningHorseMeta || null
            };
          }).filter((row) => row.horseName && row.horseName !== '—');

          setWinnerHistory(history);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setCheckingUser(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [deviceId, refreshLeaderboard]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timerId = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [countdown]);

  const sessionState = session?.state || 'setup';
  const replaying = sessionState === 'replaying';
  const bettingLocked = sessionState !== 'betting_open';
  const totalBets = Object.values(bets).reduce((sum, amt) => sum + amt, 0);
  const availableBalance = balance - totalBets;

  const handleBetChange = useCallback(
    async (horseId, newAmount) => {
      if (bettingLocked || !deviceId) return;
      if (newAmount < 0 || newAmount % 50 !== 0) return;
      if (newAmount - (bets[horseId] || 0) > availableBalance) return;

      setBets((b) => ({ ...b, [horseId]: newAmount }));
      setBalance((bal) => bal + (bets[horseId] || 0) - newAmount);

      try {
        setSubmitting(true);
        await axios.post('/api/bet', { deviceId, horseId, amount: newAmount });
      } catch (err) {
        console.error('Failed to submit bet:', err);
        setBets((b) => ({ ...b, [horseId]: bets[horseId] || 0 }));
        setBalance((bal) => bal - (bets[horseId] || 0) + newAmount);
      } finally {
        setSubmitting(false);
      }
    },
    [bets, availableBalance, bettingLocked, deviceId]
  );

  if (checkingUser) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600 space-y-4 text-center px-4">
        <p className="text-lg font-semibold">Could not find user. Please register first.</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="bg-red-600 text-white px-6 py-2 rounded font-semibold shadow hover:bg-red-700 transition"
        >
          🔁 Register Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 flex flex-col items-center text-gray-900 space-y-6 relative">
      <h1 className="text-2xl font-serif font-bold text-red-700 text-center">
        Welcome {user.firstName} {user.lastName} ({user.nickname})!
      </h1>

      <div className="bg-red-50 border border-red-200 rounded-xl shadow px-6 py-4 text-center w-full max-w-md">
        <p className="text-lg font-semibold">
          Lease Loons Balance: <span className="text-red-700">{balance}</span>
        </p>
        {rank && (
          <p className="text-sm text-gray-700 mt-1">
            Your current rank: <span className="font-bold text-red-700">#{rank}</span>
          </p>
        )}
        <p className="text-sm text-gray-700 mt-2">Session: <span className="font-semibold">{sessionState}</span></p>
        {bettingLocked ? (
          <p className="text-sm text-gray-600 mt-2">Betting is locked.</p>
        ) : (
          <p className="text-sm text-gray-600 mt-2">
            You have <span className="font-bold text-red-700">{availableBalance}</span> Lease Loons remaining to bet.
          </p>
        )}
        {countdown > 0 && !bettingLocked && (
          <p className="mt-2 text-red-700 font-mono text-lg">Time remaining: {countdown}s</p>
        )}
      </div>

      {race?.horses?.length > 0 && !bettingLocked && !replaying && (
        <div className="w-full max-w-md space-y-4">
          {race.horses.map((horse) => (
            <HorseBetTile
              key={horse.id}
              horse={horse}
              bet={bets[horse.id] || 0}
              disabled={submitting}
              maxIncrement={availableBalance + (bets[horse.id] || 0)}
              onChange={handleBetChange}
            />
          ))}
        </div>
      )}

      {latestWinner && (
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow">
          <h2 className="font-bold text-lg text-yellow-800">Most Recent Winner</h2>
          <div className="flex items-center gap-3 mt-2">
            <img src={latestWinner.horseImage} alt={latestWinner.horseName} className="w-10 h-10" />
            <div>
              <p className="font-semibold">{latestWinner.horseName}</p>
              <p className="text-sm text-gray-600">Top Loon Winner: {latestWinner.bettorName} ({latestWinner.winnings || 0})</p>
            </div>
          </div>
        </div>
      )}

      {winnerHistory.length > 0 && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-xl p-4 shadow">
          <h2 className="font-bold text-lg text-amber-900">Past Heat Winners</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {winnerHistory.slice(0, 8).map((entry) => (
              <li key={entry.raceId} className="flex items-center gap-2 rounded bg-white/75 px-2 py-1">
                <span className="text-xs font-bold text-amber-700">#{entry.raceId}</span>
                {entry.horseMeta && (
                  <HorseSprite bodyHex={entry.horseMeta.bodyHex} saddleHex={entry.horseMeta.saddleHex} alt={entry.horseName} className="w-7 h-7" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{entry.winnerName} · {entry.loons}</p>
                  <p className="text-xs text-gray-600 truncate">{entry.horseName}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {replaying && (
        <div className="w-full max-w-md bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow">
          <h2 className="font-bold text-indigo-800">Replay In Progress</h2>
          <p className="text-xs text-indigo-700 mt-1">Race {session?.selectedReplayRaceId}</p>
          <ol className="mt-2 space-y-1 text-sm">
            {replayOrder.map((entry, idx) => (
              <li key={`${entry.horseId || entry.id}-${idx}`} className="flex items-center gap-2">
                <span>{idx + 1}.</span>
                <HorseSprite bodyHex={entry.bodyHex} saddleHex={entry.saddleHex} alt={entry.name} className="w-7 h-7" />
                <span>{entry.name}</span>
              </li>
            ))}
          </ol>
          {replayOrder.length === 0 && <p className="text-sm text-indigo-700 mt-2">Waiting for replay ticks…</p>}
        </div>
      )}

      {!replaying && liveOrder.length > 0 && (
        <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-xl p-4 shadow">
          <h2 className="font-bold text-blue-800">Current Heat Order</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {liveOrder.map((entry, idx) => (
              <li key={`${entry.id}-${idx}`} className="flex items-center gap-2">
                <span>{idx + 1}.</span>
                <HorseSprite bodyHex={entry.bodyHex} saddleHex={entry.saddleHex} alt={entry.name} className="w-8 h-8" />
                <span>{entry.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="w-full max-w-md bg-gradient-to-b from-slate-100 to-slate-50 border border-slate-300 rounded-xl p-4 shadow-lg">
        <h2 className="font-black text-slate-800 tracking-wide">Live Leaderboard</h2>
        <ol className="mt-2 space-y-2 text-sm">
          {leaderboard.map((entry, i) => (
            <li key={entry.id} className="flex items-center justify-between rounded-md bg-white px-2 py-1 border border-slate-200">
              <span className="font-semibold text-slate-800">{i + 1}. {entry.nickname || 'Player'}</span>
              <span className="font-mono text-slate-900">{entry.leaseLoons}</span>
            </li>
          ))}
        </ol>
      </div>

      {race?.horses?.length === 0 && (
        <div className="text-gray-600 text-center py-8">
          🐎 The JLL Grand Gallop has not yet started.
          <br />
          Please check back soon to see which horses are competing!
        </div>
      )}

      <img
        src="/JLL_logo.png"
        alt="JLL Logo"
        className="h-10 fixed bottom-4 left-4 opacity-90"
      />
    </div>
  );
}
