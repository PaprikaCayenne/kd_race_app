// File: frontend/src/hooks/useRaceState.ts
// Version: v1.2.0 — Adds loading and error states to race polling hook

import { useEffect, useState } from "react";
import axios from "axios";

interface Horse {
  id: number;
  name: string;
  color: string;
}

export interface RaceState {
  raceId: string | null;
  locked: boolean;
  horses: Horse[];
  countdownSeconds?: number;
}

interface UseRaceStateResult {
  state: RaceState;
  loading: boolean;
  error: boolean;
}

export default function useRaceState(pollInterval = 1000): UseRaceStateResult {
  const [state, setState] = useState<RaceState>({
    raceId: null,
    locked: true,
    horses: [],
    countdownSeconds: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const fetchRaceState = async () => {
      try {
        const res = await axios.get("/api/race/current");
        const data = res.data as RaceState;

        if (isMounted) {
          setState({
            raceId: data.raceId ? String(data.raceId) : null,
            locked: data.locked,
            horses: data.horses,
            countdownSeconds: data.countdownSeconds ?? 0
          });
          setError(false);
        }
      } catch (err) {
        console.error("❌ [useRaceState] Failed to fetch race state:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRaceState(); // Initial fetch
    interval = setInterval(fetchRaceState, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pollInterval]);

  return { state, loading, error };
}
