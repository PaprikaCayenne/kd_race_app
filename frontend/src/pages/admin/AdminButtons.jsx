export default function AdminButtons({
  sessionState = 'setup',
  allowGenerateRace,
  canOpenBets,
  canStartRace,
  betCountdown,
  countdownDisplay,
  onAction,
  onOpenBets,
  generateLabel = '🎲 Generate Next Race',
  startLabel = '🏁 Start Race'
}) {
  const isBettingOpen = sessionState === 'betting_open';
  const isBettingClosed = sessionState === 'betting_closed';
  const isRunning = sessionState === 'running';
  const isReplaying = sessionState === 'replaying';

  let primaryButton = null;

  if (allowGenerateRace) {
    primaryButton = (
      <button
        onClick={() => onAction('generate-race')}
        className="px-4 py-2 rounded text-white bg-blue-600"
      >
        {generateLabel}
      </button>
    );
  } else if (isBettingOpen) {
    primaryButton = (
      <button
        disabled
        className="px-4 py-2 rounded text-white bg-gray-400 cursor-not-allowed"
      >
        📈 Bets Open {betCountdown !== null && <span>⏱️ {countdownDisplay}</span>}
      </button>
    );
  } else if (canOpenBets) {
    primaryButton = (
      <button
        onClick={onOpenBets}
        className="px-4 py-2 rounded text-white bg-green-600"
      >
        📈 Open Bets
      </button>
    );
  } else if (canStartRace || isBettingClosed) {
    primaryButton = (
      <button
        disabled={!canStartRace}
        onClick={() => onAction('start-race')}
        className={`px-4 py-2 rounded text-white ${canStartRace ? 'bg-red-600' : 'bg-gray-300'}`}
      >
        {startLabel}
      </button>
    );
  } else if (isRunning) {
    primaryButton = (
      <button
        disabled
        className="px-4 py-2 rounded text-white bg-gray-400 cursor-not-allowed"
      >
        🏇 Race Running...
      </button>
    );
  } else if (isReplaying) {
    primaryButton = (
      <button
        disabled
        className="px-4 py-2 rounded text-white bg-gray-400 cursor-not-allowed"
      >
        🎬 Replay Active
      </button>
    );
  } else {
    primaryButton = (
      <button
        disabled
        className="px-4 py-2 rounded text-white bg-gray-300 cursor-not-allowed"
      >
        Waiting For Next Stage
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {primaryButton}
    </div>
  );
}
