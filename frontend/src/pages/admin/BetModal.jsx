// File: frontend/src/pages/admin/BetModal.jsx
// Version: v2.2.6 — Extract Bet modal into its own component
// Date: 2025-05-28

export default function BetModal({
  betSeconds,
  setBetSeconds,
  confirmOpenBets,
  onCancel
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-xs w-full">
        <h2 className="text-lg font-semibold">Set Bet Timer</h2>
        <input
          type="number"
          inputMode="decimal"
          value={betSeconds}
          onChange={(e) => setBetSeconds(e.target.value)}
          placeholder="Enter seconds"
          className="w-full px-3 py-2 border border-gray-400 rounded text-center"
        />
        <div className="flex justify-center space-x-4">
          <button
            onClick={confirmOpenBets}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
