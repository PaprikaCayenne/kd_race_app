// File: frontend/src/pages/admin/AdminHeader.jsx
// Version: v2.2.2 — Extract header section into its own component
// Date: 2025-05-28

export default function AdminHeader({
  raceState,
  status,
  warnings,
  onResetRace
}) {
  const raceId     = raceState?.id    || '—';
  const raceName   = raceState?.name  || '—';
  const isEnded    = !!raceState?.endedAt;
  const isBetsOpen = raceState && !raceState.betsLocked;
  const statusLabel = !raceState
    ? 'No race yet'
    : isEnded
      ? 'Ended'
      : isBetsOpen
        ? 'Bets Open'
        : 'Waiting';

  return (
    <div className="text-center space-y-2 text-gray-700">
      <h1 className="text-2xl font-bold">🐎 JLL Derby Admin Panel</h1>
      <div>
        Race ID: {raceId} • Name: {raceName} • Status: {statusLabel}
      </div>
      <div className="text-gray-500">{status}</div>

      {warnings.length > 0 && (
        <div className="p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-xs">
          <strong>Warnings:</strong>
          <ul className="list-disc list-inside">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <button
            onClick={onResetRace}
            className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-sm"
          >
            🗑️ Reset Race
          </button>
        </div>
      )}
    </div>
  );
}
