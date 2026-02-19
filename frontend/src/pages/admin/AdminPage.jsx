// File: frontend/src/pages/admin/AdminPage.jsx
// Version: v2.9.0 — Final-race/new-tournament labels and replay-first race flow controls
// Date: 2026-02-19

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promptVisible, setPromptVisible] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');

  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState([]);

  const [raceState, setRaceState] = useState(null);
  const [session, setSession] = useState(null);
  const [pastRaces, setPastRaces] = useState([]);
  const [showRaces, setShowRaces] = useState(false);

  const [betSeconds, setBetSeconds] = useState(() => localStorage.getItem('betSeconds') || '60');
  const [betCountdown, setBetCountdown] = useState(null);
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);

  const [showDevTools, setShowDevTools] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data.users || []);
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Error loading users')}`);
    }
  };

  const fetchRaceState = async () => {
    try {
      const [raceRes, pastRes, sessionRes] = await Promise.all([
        axios.get('/api/race/latest'),
        axios.get('/api/race/races'),
        axios.get('/api/race/session')
      ]);

      setRaceState(raceRes.data.exists === false ? null : raceRes.data);
      setWarnings(raceRes.data?.warnings || []);
      setPastRaces(pastRes.data || []);
      setSession(sessionRes.data?.session || null);
    } catch (err) {
      setRaceState(null);
      setPastRaces([]);
      setStatus(`❌ ${extractError(err, 'Failed to fetch race state')}`);
    }
  };

  const closeBetsAfterCountdown = async () => {
    try {
      await axios.post('/api/admin/close-bets', {}, { headers });
      setStatus('✅ Bets auto-closed');
      await fetchRaceState();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to auto-close bets')}`);
    }
    setBetCountdown(null);
  };

  const startCountdown = (seconds) => {
    let rem = Number(seconds);
    setBetCountdown(rem);
    const iv = setInterval(() => {
      rem -= 1;
      if (rem <= 0) {
        clearInterval(iv);
        setCountdownDisplay('');
        closeBetsAfterCountdown();
      } else {
        const m = Math.floor(rem / 60);
        const s = String(rem % 60).padStart(2, '0');
        setCountdownDisplay(`${m}:${s}`);
      }
    }, 1000);
  };

  const isFinalHeat = useMemo(() => {
    return Number(session?.heatNumber || raceState?.heatNumber || 0) === 5;
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
          await fetchRaceState();
          return;
        }

        const res = await axios.post('/api/admin/generate-race', {}, { headers });
        setStatus(`✅ Generated Heat ${res.data.heatNumber}`);
        await fetchRaceState();
        return;
      }

      await axios.post(`/api/admin/${endpoint}`, {}, { headers });
      setStatus(`✅ ${endpoint.replace('-', ' ')} succeeded`);
      await fetchRaceState();
    } catch (err) {
      setStatus(`❌ ${extractError(err, `${endpoint.replace('-', ' ')} failed`)}`);
    }
  };

  const confirmOpenBets = async () => {
    localStorage.setItem('betSeconds', betSeconds);
    setShowBetModal(false);
    startCountdown(betSeconds);
    try {
      await axios.post('/api/admin/open-bets', { seconds: betSeconds }, { headers });
      setStatus(`✅ Bets opened for ${betSeconds} seconds`);
      await fetchRaceState();
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
      await fetchUsers();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Update failed')}`);
    }
  };

  const addLoons = async (userId, amount) => {
    if (!window.confirm(`Add ${amount} Lease Loons to this user?`)) return;
    try {
      await axios.post(`/api/admin/users/${userId}/add-loons`, { amount }, { headers });
      setStatus('✅ Lease Loons added');
      await fetchUsers();
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
      await fetchUsers();
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
      await fetchRaceState();
      await fetchUsers();
    } catch (err) {
      setStatus(`❌ ${extractError(err, `${endpoint.replace('-', ' ')} failed`)}`);
    }
  };

  const startReplay = async (race) => {
    try {
      await axios.post('/api/admin/replay/start', { raceId: race.id }, { headers });
      setStatus(`✅ Replay started for race ${race.id}`);
      await fetchRaceState();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to start replay')}`);
    }
  };

  const stopReplay = async () => {
    try {
      await axios.post('/api/admin/replay/stop', {}, { headers });
      setStatus('✅ Replay stopped');
      await fetchRaceState();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to stop replay')}`);
    }
  };

  const clearReplay = async () => {
    try {
      await axios.post('/api/admin/replay/clear', {}, { headers });
      setStatus('✅ Replay cleared');
      await fetchRaceState();
    } catch (err) {
      setStatus(`❌ ${extractError(err, 'Failed to clear replay')}`);
    }
  };

  const submitPassword = () => {
    if (enteredPassword === UI_PASSWORD) {
      localStorage.setItem('adminUIAuthenticated', 'true');
      setIsAuthenticated(true);
      setPromptVisible(false);
      fetchUsers();
      fetchRaceState();
    } else {
      alert('Wrong password');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('adminUIAuthenticated') === 'true') {
      setIsAuthenticated(true);
      setPromptVisible(false);
      fetchUsers();
      fetchRaceState();
    }

    raceSocket.emit('session:request-init');
    const onSession = ({ session: nextSession }) => setSession(nextSession || null);
    const onLeaderboardUpdated = () => {
      fetchUsers();
      fetchRaceState();
    };

    raceSocket.on('session:init', onSession);
    raceSocket.on('session:update', onSession);
    raceSocket.on('leaderboard:updated', onLeaderboardUpdated);

    const iv = setInterval(fetchRaceState, 2000);
    return () => {
      clearInterval(iv);
      raceSocket.off('session:init', onSession);
      raceSocket.off('session:update', onSession);
      raceSocket.off('leaderboard:updated', onLeaderboardUpdated);
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
  const canOpenBets = isRaceReady && session?.state !== 'running' && session?.state !== 'replaying';
  const canStartRace = isRaceReady && betCountdown === null;
  const allowGenerate = !raceState || !!raceState?.endedAt || session?.state === 'cleared';

  const generateLabel = shouldGenerateNewTournament
    ? '🎯 Generate New Tournament'
    : (isFinalHeat ? '🎲 Generate Final Race' : '🎲 Generate Next Race');
  const startLabel = isFinalHeat ? '🏁 Start Final Race' : '🏁 Start Race';

  return (
    <div className="p-4 text-gray-800 space-y-6 max-w-5xl mx-auto">
      <AdminHeader
        raceState={raceState}
        session={session}
        status={status}
        warnings={warnings}
      />

      <AdminButtons
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
        onReplayStop={stopReplay}
        onReplayClear={clearReplay}
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
