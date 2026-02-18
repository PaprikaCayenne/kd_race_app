// File: frontend/src/pages/admin/RacesPanel.jsx
// Version: v2.4.0 — Expanded races table with replay links and loon winner breakdown
// Date: 2026-02-18

export default function RacesPanel({
  showRaces,
  setShowRaces,
  raceState,
  pastRaces
}) {
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
                          <div className="flex flex-col gap-1">
                            <a
                              href={race.replayScreenLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Replay Race #{race.raceNumber || race.id}
                            </a>
                            <a
                              href={race.replayDataLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-gray-600 hover:underline"
                            >
                              View replay JSON
                            </a>
                          </div>
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
