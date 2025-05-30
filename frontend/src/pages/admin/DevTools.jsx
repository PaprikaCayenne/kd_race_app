// File: frontend/src/pages/admin/DevTools.jsx
// Version: v2.3.0 — Adds Seed Reset with confirmation
// Date: 2025-05-29

export default function DevTools({
  showDevTools,
  setShowDevTools,
  handleDevReset
}) {
  return (
    <div className="mt-6">
      <button
        onClick={() => setShowDevTools(!showDevTools)}
        className="w-full py-3 px-4 bg-yellow-100 text-yellow-900 rounded shadow-sm font-medium"
      >
        {showDevTools ? 'Hide Dev Tools 🛠' : 'Show Dev Tools 🛠'}
      </button>

      {showDevTools && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => handleDevReset('tournament')}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
          >
            🧹 Reset Races & Horses
          </button>
          <button
            onClick={() => handleDevReset('loons')}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
          >
            💰 Reset Lease Loons
          </button>
          <button
            onClick={() => handleDevReset('dev')}
            className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded"
          >
            ⚠️ Full Dev Reset (seed-dev.ts)
          </button>
          <button
            onClick={() => handleDevReset('seed')}
            className="bg-red-400 hover:bg-red-500 px-4 py-2 rounded text-white font-bold"
          >
            🧨 Reset Database (seed.ts)
          </button>
        </div>
      )}
    </div>
  );
}
