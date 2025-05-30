export default function AdminButtons({
  isRaceReady,
  allowGenerateRace,
  isFinalRace,
  canOpenBets,
  canStartRace,
  betCountdown,
  countdownDisplay,
  onAction,
  onOpenBets,
  showReset
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        disabled={!allowGenerateRace}
        onClick={() => onAction(isFinalRace ? 'final-race' : 'generate-race')}
        className={`px-4 py-2 rounded text-white ${allowGenerateRace ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        {isFinalRace ? '🎉 Generate Final Race' : '🎲 Generate Race'}
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

      {showReset && (
        <button
          onClick={() => {
            const confirmed = window.confirm("⚠️ This will delete all races and results.\nUsers and Lease Loons will be preserved.\n\nProceed?");
            if (confirmed) onAction('reset-tournament');
          }}
          className="px-4 py-2 rounded text-white bg-yellow-600 hover:bg-yellow-700"
        >
          ♻️ Reset Races
        </button>
      )}
    </div>
  );
}
