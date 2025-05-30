// File: frontend/src/pages/admin/AdminPage.jsx
// Version: v2.6.0 — Unifies race generation, removes Final button, clears state each time
// Date: 2025-05-29

import React, { useEffect, useState } from 'react';
import axios from 'axios';

import AdminHeader from './AdminHeader.jsx';
import AdminButtons from './AdminButtons.jsx';
import RacesPanel from './RacesPanel.jsx';
import BetModal from './BetModal.jsx';
import UserEditor from './UserEditor.jsx';
import DevTools from './DevTools.jsx';

const UI_PASSWORD = 'jll';
const SECURE_API_PASS = '6a2e8819c6fb4c15';
const headers = { 'x-admin-pass': SECURE_API_PASS };

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promptVisible, setPromptVisible] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState('');

  const [showReset, setShowReset] = useState(false);
  const [isFinalRaceOverride, setIsFinalRaceOverride] = useState(false);

  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState([]);

  const [raceState, setRaceState] = useState(null);
  const [pastRaces, setPastRaces] = useState([]);
  const [showRaces, setShowRaces] = useState(false);

  const [betSeconds, setBetSeconds] = useState(() => localStorage.getItem('betSeconds') || '60');
  const [betCountdown, setBetCountdown] = useState(null);
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);

  const [showDevTools, setShowDevTools] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/user/all', { headers });
      setUsers(res.data);
    } catch {
      setStatus('❌ Error loading users');
    }
  };

  const fetchRaceState = async () => {
    try {
      const res = await axios.get('/api/race/latest');
      if (res.data.exists === false) {
        setRaceState(null);
      } else {
        setRaceState(res.data);
        setWarnings(res.data.warnings || []);
      }
      const pastRes = await axios.get('/api/races');
      setPastRaces(pastRes.data || []);
    } catch {
      setRaceState(null);
      setPastRaces([]);
    }
  };

  const closeBetsAfterCountdown = async () => {
    try {
      await axios.post('/api/admin/close-bets', {}, { headers });
      setStatus('✅ Bets auto-closed');
      await fetchRaceState();
    } catch {
      setStatus('❌ Failed to auto-close bets');
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

  const handleAdminAction = async (endpoint) => {
    try {
      if (endpoint === 'generate-race' || endpoint === 'final-race') {
        await axios.post(`/api/admin/clear-horses`, {}, { headers });

        const res = await axios.post(`/api/admin/${endpoint}`, {}, { headers });
        setStatus(endpoint === 'final-race' ? '🎉 Final race generated' : '✅ Race generated');
        setWarnings(res.data?.warnings || []);
        setBetCountdown(null);
        setCountdownDisplay('');
        await fetchRaceState();

        if (endpoint === 'final-race') {
          setIsFinalRaceOverride(true);
          setShowReset(true);
        }

        return;
      }

      if (endpoint === 'reset-tournament') {
        await axios.post(`/api/admin/reset-tournament`, {}, { headers });
        setStatus('♻️ Tournament reset successfully');
        setShowReset(false);
        setIsFinalRaceOverride(false);
        setIsFinalRaceOverride(false);
        await fetchRaceState();

        // Clear horses from canvas
        const socket = window?.raceSocket;
        if (socket) socket.emit('admin:clear-stage');

        return;
      }


      if (endpoint === 'open-bets') {
        setShowBetModal(true);
        return;
      }

      if (endpoint === 'clear-horses') {
        await axios.post(`/api/admin/clear-horses`, {}, { headers });
        setStatus('✅ Race reset');
        await fetchRaceState();
        return;
      }

      await axios.post(`/api/admin/${endpoint}`, {}, { headers });
      setStatus(`✅ ${endpoint.replace('-', ' ')} succeeded`);
      await fetchRaceState();
    } catch {
      setStatus(`❌ ${endpoint.replace('-', ' ')} failed`);
    }
  };

  const confirmOpenBets = async () => {
    localStorage.setItem('betSeconds', betSeconds);
    setShowBetModal(false);
    startCountdown(betSeconds);
    try {
      await axios.post(
        '/api/admin/open-bets',
        { seconds: betSeconds },
        { headers }
      );
      setStatus(`✅ Bets opened for ${betSeconds} seconds`);
      await fetchRaceState();
    } catch {
      setStatus('❌ Failed to open bets');
    }
  };


  const updateUser = async (deviceId, updates) => {
    const key = Object.keys(updates)[0];
    const value = updates[key];
    if (!window.confirm(`Update ${key} to "${value}"?`)) return;
    try {
      await axios.put(`/api/admin/user/${deviceId}`, updates, { headers });
      setStatus('✅ User updated');
      await fetchUsers();
    } catch {
      setStatus('❌ Update failed');
    }
  };

const handleDevReset = async (type) => {
  const map = {
    tournament: {
      endpoint: 'reset-tournament',
      confirm: 'Reset all races, horses, and race names?',
      danger: false
    },
    loons: {
      endpoint: 'reset-loons',
      confirm: 'Reset all user Lease Loons back to 1000?',
      danger: false
    },
    dev: {
      endpoint: 'reset-dev',
      confirm: '⚠️ FULL DEV RESET. This will reseed test data from seed-dev.ts. Continue?',
      danger: true
    },
    seed: {
      endpoint: 'seed-reset',
      confirm: '⚠️ This will hard reset the DB using seed.ts. Are you sure?',
      danger: true
    }
  };

  const { endpoint, confirm, danger } = map[type];
  const ok = window.confirm(confirm);
  if (!ok) return;

  try {
    await axios.post(`/api/admin/${endpoint}`, {}, { headers });
    setStatus(`✅ ${endpoint.replace('-', ' ')} complete`);
    await fetchRaceState();
    await fetchUsers();
  } catch {
    setStatus(`❌ ${endpoint.replace('-', ' ')} failed`);
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
    const iv = setInterval(fetchRaceState, 2000);
    return () => clearInterval(iv);
  }, []);

  const isRaceReady = raceState?.horses?.length >= 4;
  const isEnded = !!raceState?.endedAt;
  const canOpenBets = isRaceReady && raceState?.betsLocked === false;
  const canStartRace = isRaceReady && betCountdown === null && raceState?.betsLocked === true;

  const raceCount = pastRaces.length;
  const allowGenerate = !raceState || isEnded;
  const isFinalRace = isFinalRaceOverride || (raceCount >= 4 && allowGenerate);

  return (
    <div className="p-4 text-gray-800 space-y-6 max-w-5xl mx-auto">
      <AdminHeader
        raceState={raceState}
        status={status}
        warnings={warnings}
        onResetRace={() => handleAdminAction('clear-horses')}
      />

      <AdminButtons
        allowGenerateRace={allowGenerate}
        isFinalRace={isFinalRace}
        showReset={showReset}
        isRaceReady={isRaceReady}
        canOpenBets={canOpenBets}
        canStartRace={canStartRace}
        betCountdown={betCountdown}
        countdownDisplay={countdownDisplay}
        onAction={handleAdminAction}
        onOpenBets={() => handleAdminAction('open-bets')}
      />

      <RacesPanel
        showRaces={showRaces}
        setShowRaces={setShowRaces}
        raceState={raceState}
        pastRaces={pastRaces}
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
      />

      <DevTools
        showDevTools={showDevTools}
        setShowDevTools={setShowDevTools}
        handleDevReset={handleDevReset}
      />
    </div>
  );
}
