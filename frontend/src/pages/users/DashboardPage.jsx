// File: frontend/src/pages/users/DashboardPage.jsx
// Version: v1.4.0 — Adds floating JLL logo, conditional bet tiles
// Date: 2025-05-29

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import HorseBetTile from "../../components/HorseBetTile.jsx";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function getDeviceId() {
  let id = localStorage.getItem("deviceId") || getCookie("deviceId");
  if (!id) {
    id = crypto.randomUUID();
  }
  localStorage.setItem("deviceId", id);
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [userRes, raceRes] = await Promise.allSettled([
          axios.get(`/api/user/${deviceId}`),
          axios.get("/api/race/current"),
        ]);

      if (userRes.status === "fulfilled") {
        setUser(userRes.value.data);
        setBalance(userRes.value.data.leaseLoons);

        const initialBets = {};
        if (userRes.value.data.bets?.length) {
          userRes.value.data.bets.forEach((bet) => {
            initialBets[bet.horseId] = bet.amount;
          });
        }
        setBets(initialBets);

        // 🔥 New: Fetch leaderboard + rank
        const leaderboardRes = await axios.get("/api/leaderboard");
        const leaderboardData = leaderboardRes?.data?.leaderboard || [];
        setLeaderboard(leaderboardData);

        const userRank = leaderboardData.findIndex(u => u.id === userRes.value.data.id);
        if (userRank >= 0) setRank(userRank + 1);
      } else {
          setUser(null);
        }

        if (raceRes.status === "fulfilled") {
          const raceData = raceRes.value.data || { horses: [] };
          setRace(raceData);
          setCountdown(raceData.countdownSeconds || 0);
        } else {
          setRace({ horses: [] });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setCheckingUser(false);
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timerId = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [countdown]);

  const horsesAvailable = race?.horses?.length > 0;
  const bettingLocked = !(race?.betsLocked === false && countdown > 0);
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
        await axios.post("/api/bet", { deviceId, horseId, amount: newAmount });
      } catch (err) {
        console.error("Failed to submit bet:", err);
        setBets((b) => ({ ...b, [horseId]: bets[horseId] || 0 }));
        setBalance((bal) => bal - (bets[horseId] || 0) + newAmount);
      } finally {
        setSubmitting(false);
      }
    },
    [bets, availableBalance, bettingLocked]
  );

  if (checkingUser) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-600 space-y-4 text-center px-4">
        <p className="text-lg font-semibold">Could not find user. Please register first.</p>
        <button
          onClick={() => (window.location.href = "/")}
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
          {/* 👇 ADD THIS BELOW */}
          {rank && (
            <p className="text-sm text-gray-700 mt-1">
              Your current rank: <span className="font-bold text-red-700">#{rank}</span>
            </p>
          )}
        {bettingLocked ? (
          <p className="text-sm text-gray-600 mt-2">Betting is locked.</p>
        ) : (
          <p className="text-sm text-gray-600 mt-2">
            You have{" "}
            <span className="font-bold text-red-700">{availableBalance}</span>{" "}
            Lease Loons remaining to bet.
          </p>
        )}
        {countdown > 0 && !bettingLocked && (
          <p className="mt-2 text-red-700 font-mono text-lg">
            Time remaining: {countdown}s
          </p>
        )}
      </div>

      {race?.horses?.length > 0 && !bettingLocked && (
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

      {race?.horses?.length === 0 && (
        <div className="text-gray-600 text-center py-8">
          🐎 The JLL Grand Gallop has not yet started.
          <br />
          Please check back soon to see which horses are competing!
        </div>
      )}

      {/* 🏁 Floating logo in bottom-left */}
      <img
        src="/JLL_logo.png"
        alt="JLL Logo"
        className="h-10 fixed bottom-4 left-4 opacity-90"
      />
    </div>
  );
}
