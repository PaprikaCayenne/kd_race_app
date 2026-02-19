function formatReplayClock(ms = 0) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RacesPanel({
  showRaces,
  setShowRaces,
  raceState,
  pastRaces,
  session,
  onReplaySelect,
  onReplayToggle,
  onReplayClear,
  replayProgress,
  replaySeekMs,
  onReplaySeekChange,
  onReplaySeekCommit,
  replayRate = 1,
  onReplayRateChange,
  onReplayRateCommit
}) {
  const replayActive = session?.state === 'replaying';
  const replayLoadedRaceId = replayActive ? session?.selectedReplayRaceId : null;
  const replayPaused = replayActive ? Boolean(session?.replayPaused) : true;
  const replayDuration = Math.max(0, Number(replayProgress?.durationMs) || 0);
  const replayElapsed = Math.max(0, Number(replaySeekMs ?? replayProgress?.elapsedMs) || 0);
  const rateValue = Math.max(0.25, Math.min(3, Number(replayRate) || 1));

  return (
    <div>
      <button
        onClick={() => setShowRaces(!showRaces)}
        className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 text-red-800 rounded shadow-sm font-medium"
      >
        {showRaces ? 'Hide Races 📋' : 'Show Races 📋'}
      </button>

      {showRaces && (
        <div className="mt-4 border p-4 rounded bg-white space-y-4">
          <h2 className="text-xl font-bold">Current Race: {raceState?.name || '—'}</h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onReplayToggle}
              disabled={!replayLoadedRaceId}
              className={`px-3 py-1 rounded text-white text-sm ${
                replayLoadedRaceId
                  ? (replayPaused ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700')
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {replayPaused ? 'Start Replay' : 'Pause Replay'}
            </button>
            <button
              type="button"
              onClick={onReplayClear}
              className="px-3 py-1 rounded bg-gray-700 text-white text-sm"
            >
              Clear Replay
            </button>
            <span className="text-xs text-gray-600 self-center">
              Replay: {replayLoadedRaceId ? `Race ${replayLoadedRaceId}` : 'none loaded'}
            </span>
            <span className="text-xs text-gray-600 self-center">
              State: {replayActive ? (replayPaused ? 'paused' : 'playing') : 'inactive'}
            </span>
          </div>

          {replayLoadedRaceId && replayDuration > 0 && (
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                <span>{formatReplayClock(replayElapsed)}</span>
                <span>{formatReplayClock(replayDuration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={replayDuration}
                step={100}
                value={Math.min(replayDuration, replayElapsed)}
                onChange={(e) => onReplaySeekChange?.(Number(e.target.value) || 0)}
                onMouseUp={(e) => onReplaySeekCommit?.(Number(e.currentTarget.value) || 0)}
                onTouchEnd={(e) => onReplaySeekCommit?.(Number(e.currentTarget.value) || 0)}
                className="w-full"
              />
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-700 mb-1">
                  <span>Replay speed</span>
                  <span>{rateValue.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={rateValue}
                  onChange={(e) => onReplayRateChange?.(Number(e.target.value) || 1)}
                  onMouseUp={(e) => onReplayRateCommit?.(Number(e.currentTarget.value) || 1)}
                  onTouchEnd={(e) => onReplayRateCommit?.(Number(e.currentTarget.value) || 1)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {pastRaces.length === 0 ? (
            <p className="text-gray-500">No completed races with replay data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left border">Race #</th>
                    <th className="p-2 text-left border">Race Name</th>
                    <th className="p-2 text-left border">Winning Horse</th>
                    <th className="p-2 text-left border">Loon Winners</th>
                    <th className="p-2 text-left border">Replay</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRaces.map((race) => (
                    <tr key={race.id} className="odd:bg-white even:bg-gray-50 align-top">
                      <td className="p-2 border font-semibold">{race.raceNumber || race.id}</td>
                      <td className="p-2 border">
                        <div className="font-semibold">{race.name}</div>
                        <div className="text-xs text-gray-500">
                          Ended: {race.endedAt ? new Date(race.endedAt).toLocaleString() : '—'}
                        </div>
                      </td>
                      <td className="p-2 border">{race.winningHorse || '—'}</td>
                      <td className="p-2 border">
                        {Array.isArray(race.loonWinners) && race.loonWinners.length > 0 ? (
                          <ul className="space-y-1">
                            {race.loonWinners.map((winner) => (
                              <li key={`${race.id}-${winner.name}`} className={winner.isTop ? 'font-bold text-red-700' : ''}>
                                {winner.name} · {winner.loons}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">No loon winners</span>
                        )}
                      </td>
                      <td className="p-2 border">
                        {race.replayAvailable ? (
                          <button
                            type="button"
                            onClick={() => onReplaySelect?.(race)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Load Replay
                          </button>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
