// File: frontend/src/pages/admin/AdminHeader.jsx
// Version: v2.5.0 — Red banner header with centered title and persistent status in header area
// Date: 2026-02-19

export default function AdminHeader({
  raceState,
  session,
  status,
  warnings
}) {
  const raceId = raceState?.id || session?.activeRaceId || '—';
  const raceName = raceState?.name || '—';
  const heatNumber = session?.heatNumber || raceState?.heatNumber || '—';
  const statusLabel = session?.state || (raceState ? 'setup' : 'no_race');

  return (
    <div className="space-y-2 text-gray-700">
      <div className="rounded-2xl border border-red-300 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white px-4 py-4 shadow-lg">
        <h1 className="text-2xl font-black text-center tracking-wide">JLL Derby Admin Panel</h1>
        <div className="text-center text-sm mt-1 text-red-100">
          Race ID: {raceId} • Heat: {heatNumber} • Session: {statusLabel}
        </div>
        <div className="text-center text-xs mt-1 text-red-200 truncate">{raceName}</div>
      </div>

      <div className="text-left text-sm text-gray-700 min-h-5">{status}</div>

      {warnings.length > 0 && (
        <div className="p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-xs">
          <strong>Warnings:</strong>
          <ul className="list-disc list-inside">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
