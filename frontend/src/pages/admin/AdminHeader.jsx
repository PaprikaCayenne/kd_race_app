// File: frontend/src/pages/admin/AdminHeader.jsx
// Version: v2.4.0 — Keeps status in header area without clear-race action
// Date: 2026-02-19

export default function AdminHeader({
  raceState,
  session,
  status,
  warnings
}) {
  const raceId = raceState?.id || session?.activeRaceId || '—';
  const raceName = raceState?.name || '—';
  const statusLabel = session?.state || (raceState ? 'setup' : 'No race yet');

  return (
    <div className="space-y-2 text-gray-700">
      <h1 className="text-2xl font-bold text-left">🐎 JLL Derby Admin Panel</h1>
      <div className="text-left text-sm">
        Race ID: {raceId} • Name: {raceName} • Session: {statusLabel}
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
