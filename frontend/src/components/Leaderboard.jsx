// File: frontend/src/components/Leaderboard.jsx
// Version: v1.1.0 — Adds polling for live leaderboard updates
// Date: 2025-05-29

import { useEffect, useState } from "react";
import axios from "axios";

export default function Leaderboard({ showTitle = true }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get("/api/leaderboard");
        setLeaderboard(res.data.leaderboard || []);
      } catch (err) {
        console.error("❌ Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard(); // initial load
    const interval = setInterval(fetchLeaderboard, 5000); // poll every 5s

    return () => clearInterval(interval); // cleanup
  }, []);

  return (
    <div className="bg-white text-gray-800 p-4 rounded shadow max-w-md w-full">
      {showTitle && <h2 className="text-xl font-bold mb-3">🏆 Lease Loons Leaderboard</h2>}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((user, idx) => (
            <li key={user.id} className="flex justify-between border-b py-1">
              <span>{idx + 1}. {user.nickname}</span>
              <span className="text-gray-600">{user.leaseLoons} 🪙</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
