// File: frontend/src/pages/admin/AdminPage.jsx
// Version: v3.0.0 — Uses React Query for admin users/race bundle while preserving existing controls
// Date: 2026-02-19

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import AdminHeader from './AdminHeader.jsx';
import AdminButtons from './AdminButtons.jsx';
import RacesPanel from './RacesPanel.jsx';
import BetModal from './BetModal.jsx';
import UserEditor from './UserEditor.jsx';
import DevTools from './DevTools.jsx';

const UI_PASSWORD = 'jll';
const SECURE_API_PASS = '6a2e8819c6fb4c15';
const headers = { 'x-admin-pass': SECURE_API_PASS };
const raceSocket = io('/race', { path: '/api/socket.io' });

function extractError(err, fallback) {
  return err?.response?.data?.error || fallback;
}

async function fetchAdminUsers() {
  const res = await axios.get('/api/admin/users', { headers });
  return res.data.users || [];
}

async function fetchAdminRaceBundle() {
  const [currentRes, raceRes, pastRes, sessionRes] = await Promise.all([
    axios.get('/api/race/current'),
    axios.get('/api/race/latest'),
    axios.get('/api/race/races'),
    axios.get('/api/race/session')
  ]);

  const currentRace = currentRes.data?.exists === false ? null : currentRes.data;
  const latestRace = raceRes.data?.exists === false ? null : raceRes.data;
  const raceState = currentRace || latestRace;

  return {
    raceState,
    warnings: raceState?.warnings || [],
    pastRaces: pastRes.data || [],
    session: sessionRes.data?.session || null
  };
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promptVisible, setPromptVisible] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');

  const [showUsers, setShowUsers] = useState(false);
  const [status, setStatus] = useState('');

  const [showRaces, setShowRaces] = useState(false);
  const [betSeconds, setBetSeconds] = useState(() => localStorage.getItem('betSeconds') || '60');
  const [betCountdown, setBetCountdown] = useState(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [replayProgress, setReplayProgress] = useState({ elapsedMs: 0, durationMs: 0 });
  const [replaySeekMs, setReplaySeekMs] = useState(0);
  const [replayRate, setReplayRate] = useState(1);

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
    enabled: isAuthenticated,
    refetchInterval: 5000
  });

  const raceBundleQuery = useQuery({
    queryKey: ['admin-race-bundle'],
    queryFn: fetchAdminRaceBundle,
    enabled: isAuthenticated,
    refetchInterval: 2000
  });

  const users = usersQuery.data || [];
  const raceState = raceBundleQuery.data?.raceState || null;
  const warnings = raceBundleQuery.data?.warnings || [];
  const pastRaces = raceBundleQuery.data?.pastRaces || [];
  const session = raceBundleQuery.data?.session || null;

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-race-bundle'] })
    ]);
  };

  const isFinalHeat = useMemo(() => {
    return Number(session?.heatNumber || raceState?.heatNumber || 0) === 5;
  }, [raceState?.heatNumber, session?.heatNumber]);

  const currentHeatNumber = useMemo(() => {
    return Math.max(1, Math.min(5, Number(session?.heatNumber || raceState?.heatNumber || 1)));
  }, [raceState?.heatNumber, session?.heatNumber]);

  const shouldGenerateNewTournament = useMemo(() => {
    return Boolean(
      isFinalHeat
      && raceState
      && raceState.endedAt
      && session?.state !== 'running'
      && session?.state !== 'replaying'
    );
  }, [isFinalHeat, raceState, session?.state]);

  useEffect(() => {
    const serverCountdown = Number(raceState?.countdownSeconds) || 0;
    if (session?.state === 'betting_open' && serverCountdown > 0) {
      setBetCountdown(serverCountdown);
    } else {
      setBetCountdown(null);
    }
  }, [raceState?.countdownSeconds, session?.state]);

  useEffect(() => {
    if (session?.state === 'replaying') return;
    setReplayProgress({ elapsedMs: 0, durationMs: 0 });
    setReplaySeekMs(0);
    setReplayRate(1);
  }, [session?.state]);

  const handleAdminAction = async (endpoint) => {
    try {
      if (endpoint === 'open-bets') {
        setShowBetModal(true);
        return;
      }

      if (endpoint === 'generate-race') {
        if (shouldGenerateNewTournament) {
          await axios.post('/api/admin/reset-tournament', {}, { headers });
          const first = await axios.post('/api/admin/generate-race', {}, { headers });
          setStatus(`✅ New tournament created. Generated Heat ${first.data.heatNumber}`);
          await refreshQueries();
          return;
        }

        const res = await axios.post('/api/admin/generate-race', {}, { headers });
        setStatus(`✅ Generated Heat ${res.data.heatNumber}`);
        await refreshQueries();
        return;
      }

      await axios.post(`/api/admin/${endpoint}`, {}, { headers });
      setStatus(`✅ ${endpoint.replace('-', ' ')} succeeded`);
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, `${endpoint.replace('-', ' ')} failed`)}`);
    }
  };

  const confirmOpenBets = async () => {
    localStorage.setItem('betSeconds', betSeconds);
    setShowBetModal(false);
    try {
      await axios.post('/api/admin/open-bets', { seconds: betSeconds }, { headers });
      setStatus(`✅ Bets opened for ${betSeconds} seconds`);
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to open bets')}`);
    }
  };

  const updateUser = async (userId, updates) => {
    const key = Object.keys(updates)[0];
    const value = updates[key];
    if (!window.confirm(`Update ${key} to "${value}"?`)) return;
    try {
      await axios.patch(`/api/admin/users/${userId}`, updates, { headers });
      setStatus('✅ User updated');
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Update failed')}`);
    }
  };

  const addLoons = async (userId, amount) => {
    if (!window.confirm(`Add ${amount} Lease Loons to this user?`)) return;
    try {
      await axios.post(`/api/admin/users/${userId}/add-loons`, { amount }, { headers });
      setStatus('✅ Lease Loons added');
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to add loons')}`);
    }
  };

  const deleteUser = async (userId) => {
    const ok = window.confirm('Delete this user and related bets/registrations?');
    if (!ok) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, { headers });
      setStatus('✅ User deleted');
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Delete failed')}`);
    }
  };

  const handleDevReset = async (type) => {
    const map = {
      tournament: {
        endpoint: 'reset-tournament',
        confirm: 'Reset races and horses only? Users and loons are preserved.'
      },
      loons: {
        endpoint: 'reset-loons',
        confirm: 'Reset all user Lease Loons back to default?'
      },
      dev: {
        endpoint: 'seed-reset',
        confirm: '⚠️ Full Dev Reset. This wipes and reseeds everything. Continue?'
      }
    };

    const { endpoint, confirm } = map[type];
    const ok = window.confirm(confirm);
    if (!ok) return;

    try {
      await axios.post(`/api/admin/${endpoint}`, {}, { headers });
      setStatus(`✅ ${endpoint.replace('-', ' ')} complete`);
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, `${endpoint.replace('-', ' ')} failed`)}`);
    }
  };

  const startReplay = async (race) => {
    try {
      await axios.post('/api/admin/replay/start', { raceId: race.id }, { headers });
      setStatus(`✅ Replay loaded for race ${race.id}`);
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to start replay')}`);
    }
  };

  const toggleReplay = async () => {
    if (session?.state !== 'replaying' || !session?.selectedReplayRaceId) {
      setStatus('⚠️ Load a replay race first.');
      return;
    }

    try {
      if (session?.replayPaused) {
        await axios.post('/api/admin/replay/play', {}, { headers });
        setStatus('✅ Replay started');
      } else {
        await axios.post('/api/admin/replay/stop', {}, { headers });
        setStatus('✅ Replay paused');
      }
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Replay control failed')}`);
    }
  };

  const clearReplay = async () => {
    try {
      await axios.post('/api/admin/replay/clear', {}, { headers });
      setStatus('✅ Replay cleared');
      await refreshQueries();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to clear replay')}`);
    }
  };

  const seekReplay = async (timeMs) => {
    if (session?.state !== 'replaying' || !session?.selectedReplayRaceId) return;

    const next = Math.max(0, Number(timeMs) || 0);
    try {
      await axios.post('/api/admin/replay/seek', { timeMs: next }, { headers });
      setReplaySeekMs(next);
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to seek replay')}`);
    }
  };

  const setReplaySpeed = async (rate) => {
    if (session?.state !== 'replaying' || !session?.selectedReplayRaceId) return;

    const nextRate = Math.max(0.25, Math.min(3, Number(rate) || 1));
    try {
      await axios.post('/api/admin/replay/speed', { rate: nextRate }, { headers });
      setReplayRate(nextRate);
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to update replay speed')}`);
    }
  };

  const submitPassword = () => {
    if (enteredPassword === UI_PASSWORD) {
      localStorage.setItem('adminUIAuthenticated', 'true');
      setIsAuthenticated(true);
      setPromptVisible(false);
    } else {
      alert('Wrong password');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('adminUIAuthenticated') === 'true') {
      setIsAuthenticated(true);
      setPromptVisible(false);
    }

    raceSocket.emit('session:request-init');
    const onLeaderboardUpdated = () => {
      refreshQueries();
    };

    const onReplayLoaded = ({ elapsedMs = 0, durationMs = 0, rate = 1 } = {}) => {
      const elapsed = Number(elapsedMs) || 0;
      const duration = Number(durationMs) || 0;
      setReplayProgress({ elapsedMs: elapsed, durationMs: duration });
      setReplaySeekMs(elapsed);
      setReplayRate(Math.max(0.25, Math.min(3, Number(rate) || 1)));
    };

    const onReplayTick = ({ elapsedMs = 0, durationMs = 0, rate = 1 } = {}) => {
      const elapsed = Number(elapsedMs) || 0;
      const duration = Number(durationMs) || 0;
      setReplayProgress({ elapsedMs: elapsed, durationMs: duration });
      setReplaySeekMs(elapsed);
      setReplayRate(Math.max(0.25, Math.min(3, Number(rate) || 1)));
    };

    const onReplayPaused = ({ elapsedMs = 0, durationMs = 0, rate = 1 } = {}) => {
      const elapsed = Number(elapsedMs) || 0;
      const duration = Number(durationMs) || 0;
      setReplayProgress({ elapsedMs: elapsed, durationMs: duration });
      setReplaySeekMs(elapsed);
      setReplayRate(Math.max(0.25, Math.min(3, Number(rate) || 1)));
      refreshQueries();
    };

    const onReplayFinished = ({ durationMs = 0 } = {}) => {
      const duration = Number(durationMs) || 0;
      setReplayProgress({ elapsedMs: duration, durationMs: duration });
      setReplaySeekMs(duration);
      refreshQueries();
    };

    const onReplayCleared = () => {
      setReplayProgress({ elapsedMs: 0, durationMs: 0 });
      setReplaySeekMs(0);
      setReplayRate(1);
      refreshQueries();
    };

    const onReplayRate = ({ rate = 1 } = {}) => {
      setReplayRate(Math.max(0.25, Math.min(3, Number(rate) || 1)));
    };

    raceSocket.on('leaderboard:updated', onLeaderboardUpdated);
    raceSocket.on('replay:loaded', onReplayLoaded);
    raceSocket.on('replay:tick', onReplayTick);
    raceSocket.on('replay:paused', onReplayPaused);
    raceSocket.on('replay:seeked', onReplayPaused);
    raceSocket.on('replay:rate', onReplayRate);
    raceSocket.on('replay:finished', onReplayFinished);
    raceSocket.on('replay:cleared', onReplayCleared);

    return () => {
      raceSocket.off('leaderboard:updated', onLeaderboardUpdated);
      raceSocket.off('replay:loaded', onReplayLoaded);
      raceSocket.off('replay:tick', onReplayTick);
      raceSocket.off('replay:paused', onReplayPaused);
      raceSocket.off('replay:seeked', onReplayPaused);
      raceSocket.off('replay:rate', onReplayRate);
      raceSocket.off('replay:finished', onReplayFinished);
      raceSocket.off('replay:cleared', onReplayCleared);
    };
  }, []);

  if (!isAuthenticated && promptVisible) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border rounded-xl p-5 shadow">
          <h2 className="text-xl font-bold mb-3">Admin Login</h2>
          <input
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter admin password"
          />
          <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded" onClick={submitPassword}>Enter</button>
        </div>
      </div>
    );
  }

  const isRaceReady = raceState?.horses?.length >= 4;
  const hasOpenCountdown = session?.state === 'betting_open' && (Number(betCountdown) || 0) > 0;
  const countdownDisplay = hasOpenCountdown
    ? `${Math.floor((Number(betCountdown) || 0) / 60)}:${String((Number(betCountdown) || 0) % 60).padStart(2, '0')}`
    : '';
  const canOpenBets = isRaceReady && session?.state !== 'running' && session?.state !== 'replaying';
  const canStartRace = isRaceReady && !hasOpenCountdown && session?.state !== 'running' && session?.state !== 'replaying';
  const allowGenerate = !raceState || !!raceState?.endedAt || session?.state === 'cleared';

  const generateLabel = shouldGenerateNewTournament
    ? '🎯 Generate New Tournament'
    : (() => {
      const nextHeat = raceState?.endedAt ? Math.min(5, currentHeatNumber + 1) : currentHeatNumber;
      return `🎲 Generate Heat ${nextHeat}${nextHeat === 5 ? ' Final' : ''}`;
    })();
  const startLabel = isFinalHeat ? '🏁 Start Final Race' : `🏁 Start Heat ${currentHeatNumber}`;

  return (
    <div className="p-4 text-gray-800 space-y-6 max-w-5xl mx-auto">
      <AdminHeader
        raceState={raceState}
        session={session}
        status={status}
        warnings={warnings}
      />

      <AdminButtons
        sessionState={session?.state || 'setup'}
        allowGenerateRace={allowGenerate}
        canOpenBets={canOpenBets}
        canStartRace={canStartRace}
        betCountdown={betCountdown}
        countdownDisplay={countdownDisplay}
        onAction={handleAdminAction}
        onOpenBets={() => handleAdminAction('open-bets')}
        generateLabel={generateLabel}
        startLabel={startLabel}
      />

      <RacesPanel
        showRaces={showRaces}
        setShowRaces={setShowRaces}
        raceState={raceState}
        pastRaces={pastRaces}
        session={session}
        onReplaySelect={startReplay}
        onReplayToggle={toggleReplay}
        onReplayClear={clearReplay}
        replayProgress={replayProgress}
        replaySeekMs={replaySeekMs}
        onReplaySeekChange={setReplaySeekMs}
        onReplaySeekCommit={seekReplay}
        replayRate={replayRate}
        onReplayRateChange={setReplayRate}
        onReplayRateCommit={setReplaySpeed}
      />

      {showBetModal && (
        <BetModal
          betSeconds={betSeconds}
          setBetSeconds={setBetSeconds}
          confirmOpenBets={confirmOpenBets}
          onCancel={() => setShowBetModal(false)}
        />
      )}

      <UserEditor
        users={users}
        showUsers={showUsers}
        setShowUsers={setShowUsers}
        updateUser={updateUser}
        addLoons={addLoons}
        deleteUser={deleteUser}
      />

      <DevTools
        showDevTools={showDevTools}
        setShowDevTools={setShowDevTools}
        handleDevReset={handleDevReset}
      />
    </div>
  );
}
