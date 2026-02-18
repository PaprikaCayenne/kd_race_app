export default function AdminButtons({
  allowGenerateRace,
  canOpenBets,
  canStartRace,
  canClearRace,
  betCountdown,
  countdownDisplay,
  onAction,
  onOpenBets,
  onClearRace
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        disabled={!allowGenerateRace}
        onClick={() => onAction('generate-race')}
        className={`px-4 py-2 rounded text-white ${allowGenerateRace ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        🎲 Generate Next Race
      </button>

      <button
        disabled={!canOpenBets}
        onClick={onOpenBets}
        className={`px-4 py-2 rounded text-white ${canOpenBets ? 'bg-green-600' : 'bg-gray-300'}`}
      >
        📈 Open Bets {betCountdown !== null && <span>⏱️ {countdownDisplay}</span>}
      </button>

      <button
        disabled={!canStartRace}
        onClick={() => onAction('start-race')}
        className={`px-4 py-2 rounded text-white ${canStartRace ? 'bg-red-600' : 'bg-gray-300'}`}
      >
        🏁 Start Race
      </button>

      <button
        disabled={!canClearRace}
        onClick={onClearRace}
        className={`px-4 py-2 rounded text-white ${canClearRace ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-300'}`}
      >
        🧹 Clear Race
      </button>
    </div>
  );
}
