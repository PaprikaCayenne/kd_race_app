import prisma from './prisma.js';

export type RaceSessionState =
  | 'setup'
  | 'betting_open'
  | 'betting_closed'
  | 'running'
  | 'finished'
  | 'cleared'
  | 'replaying';

export interface RaceSession {
  activeRaceId: string | null;
  tournamentId: string | null;
  heatNumber: 1 | 2 | 3 | 4 | 5;
  state: RaceSessionState;
  selectedReplayRaceId: string | null;
  replayPaused: boolean;
  liveStateBeforeReplay: RaceSessionState;
  updatedAt: string;
}

const SESSION_ROW_ID = 'primary';

let raceSession: RaceSession = {
  activeRaceId: null,
  tournamentId: null,
  heatNumber: 1,
  state: 'setup',
  selectedReplayRaceId: null,
  replayPaused: false,
  liveStateBeforeReplay: 'setup',
  updatedAt: new Date().toISOString()
};

function toSessionState(value: string): RaceSessionState {
  const allowed = new Set<RaceSessionState>([
    'setup',
    'betting_open',
    'betting_closed',
    'running',
    'finished',
    'cleared',
    'replaying'
  ]);
  return allowed.has(value as RaceSessionState) ? (value as RaceSessionState) : 'setup';
}

async function persistSession(): Promise<void> {
  await prisma.raceSessionStore.upsert({
    where: { id: SESSION_ROW_ID },
    create: {
      id: SESSION_ROW_ID,
      activeRaceId: raceSession.activeRaceId,
      tournamentId: raceSession.tournamentId,
      heatNumber: raceSession.heatNumber,
      state: raceSession.state,
      selectedReplayRaceId: raceSession.selectedReplayRaceId,
      replayPaused: raceSession.replayPaused,
      liveStateBeforeReplay: raceSession.liveStateBeforeReplay
    },
    update: {
      activeRaceId: raceSession.activeRaceId,
      tournamentId: raceSession.tournamentId,
      heatNumber: raceSession.heatNumber,
      state: raceSession.state,
      selectedReplayRaceId: raceSession.selectedReplayRaceId,
      replayPaused: raceSession.replayPaused,
      liveStateBeforeReplay: raceSession.liveStateBeforeReplay
    }
  });
}

export function getRaceSession(): RaceSession {
  return { ...raceSession };
}

export async function updateRaceSession(patch: Partial<RaceSession>): Promise<RaceSession> {
  raceSession = {
    ...raceSession,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await persistSession();
  return getRaceSession();
}

export async function bootstrapRaceSession(): Promise<RaceSession> {
  const persisted = await prisma.raceSessionStore.findUnique({ where: { id: SESSION_ROW_ID } });

  if (persisted) {
    raceSession = {
      activeRaceId: persisted.activeRaceId,
      tournamentId: persisted.tournamentId,
      heatNumber: Math.min(5, Math.max(1, persisted.heatNumber || 1)) as 1 | 2 | 3 | 4 | 5,
      state: toSessionState(persisted.state),
      selectedReplayRaceId: persisted.selectedReplayRaceId,
      replayPaused: Boolean(persisted.replayPaused),
      liveStateBeforeReplay: toSessionState(persisted.liveStateBeforeReplay),
      updatedAt: persisted.updatedAt.toISOString()
    };
    return getRaceSession();
  }

  const latestRace = await prisma.race.findFirst({
    orderBy: { id: 'desc' },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      betsLocked: true,
      betClosesAt: true,
      tournamentId: true,
      heatNumber: true
    }
  });

  if (!latestRace) {
    await persistSession();
    return getRaceSession();
  }

  const now = Date.now();
  let state: RaceSessionState = 'setup';

  if (latestRace.endedAt) state = 'finished';
  else if (latestRace.startedAt) state = 'running';
  else if (!latestRace.betsLocked && latestRace.betClosesAt && latestRace.betClosesAt.getTime() > now) state = 'betting_open';
  else if (latestRace.betsLocked) state = 'betting_closed';

  raceSession = {
    ...raceSession,
    activeRaceId: latestRace.id.toString(),
    tournamentId: latestRace.tournamentId,
    heatNumber: Math.min(5, Math.max(1, latestRace.heatNumber || 1)) as 1 | 2 | 3 | 4 | 5,
    state,
    updatedAt: new Date().toISOString()
  };

  await persistSession();
  return getRaceSession();
}

export async function startReplaySession(raceId: string): Promise<RaceSession> {
  return updateRaceSession({
    liveStateBeforeReplay: raceSession.state === 'replaying' ? raceSession.liveStateBeforeReplay : raceSession.state,
    state: 'replaying',
    selectedReplayRaceId: raceId,
    replayPaused: false
  });
}

export async function stopReplaySession(): Promise<RaceSession> {
  return updateRaceSession({
    state: 'replaying',
    replayPaused: true
  });
}

export async function clearReplaySession(): Promise<RaceSession> {
  return updateRaceSession({
    state: raceSession.liveStateBeforeReplay,
    selectedReplayRaceId: null,
    replayPaused: false
  });
}
