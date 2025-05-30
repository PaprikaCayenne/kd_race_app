// File: frontend/src/pages/admin/RacesPanel.jsx
// Version: v2.2.5 — Extract Races panel into its own component
// Date: 2025-05-28

export default function RacesPanel({
  showRaces,
  setShowRaces,
  raceState,
  pastRaces
}) {
  const renderRaceResults = (results) => (
    <div className="grid grid-cols-4 gap-2 text-sm mt-2">
      {results.map((res, idx) => (
        <div key={res.horse.id} className="rounded border p-2 bg-gray-50 text-center">
          <div className="font-bold">{res.horse.name}</div>
          <div className="text-xs italic">{res.horse.color}</div>
          <div>
            {['🥇', '🥈', '🥉'][idx] || `${idx + 1}th`} –{' '}
            <span className="text-gray-700">{(res.timeMs / 1000).toFixed(3)}s</span>
          </div>
        </div>
      ))}
    </div>
  );

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
          <h2 className="text-xl font-bold mb-2">
            Current Race: {raceState?.name || '—'}
          </h2>

          {raceState?.results?.length > 0
            ? renderRaceResults(raceState.results)
            : <p className="text-gray-500">No results yet</p>
          }

          {pastRaces.map((race) => (
            <details key={race.id} className="border p-2 rounded">
              <summary className="cursor-pointer font-semibold">
                🏁 {race.name}
              </summary>
              {race.results?.length > 0
                ? renderRaceResults(race.results)
                : <p className="text-gray-500">No results recorded</p>
              }
            </details>
          ))}
        </div>
      )}
    </div>
);
}
