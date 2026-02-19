// File: frontend/src/pages/admin/DevTools.jsx
// Version: v2.4.0 — Removes direct seed reset button and keeps explicit dev reset actions
// Date: 2026-02-18

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
            className="bg-red-300 hover:bg-red-400 px-4 py-2 rounded sm:col-span-2 font-semibold"
          >
            ⚠️ Full Dev Reset (Wipes + Reseeds)
          </button>
        </div>
      )}
    </div>
  );
}
