import { PrismaClient } from '@prisma/client';

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

export function getRaceSession(): RaceSession {
  return { ...raceSession };
}

export function updateRaceSession(patch: Partial<RaceSession>): RaceSession {
  raceSession = {
    ...raceSession,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  return getRaceSession();
}

export async function bootstrapRaceSession(prisma: PrismaClient): Promise<RaceSession> {
  const [latestRace, raceCount] = await Promise.all([
    prisma.race.findFirst({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        betsLocked: true,
        betClosesAt: true
      }
    }),
    prisma.race.count({ where: { isTest: false } })
  ]);

  if (!latestRace) {
    raceSession = {
      ...raceSession,
      activeRaceId: null,
      tournamentId: null,
      heatNumber: 1,
      state: 'setup',
      updatedAt: new Date().toISOString()
    };
    return getRaceSession();
  }

  const ordinalInTournament = ((Math.max(1, raceCount) - 1) % 5) + 1;
  const tournamentNumber = Math.floor((Math.max(1, raceCount) - 1) / 5) + 1;

  let state: RaceSessionState = 'setup';
  const now = Date.now();
  if (latestRace.endedAt) state = 'finished';
  else if (latestRace.startedAt) state = 'running';
  else if (!latestRace.betsLocked && latestRace.betClosesAt && latestRace.betClosesAt.getTime() > now) state = 'betting_open';
  else if (latestRace.betsLocked) state = 'betting_closed';

  raceSession = {
    ...raceSession,
    activeRaceId: latestRace.id.toString(),
    tournamentId: `tournament-${tournamentNumber}`,
    heatNumber: ordinalInTournament as 1 | 2 | 3 | 4 | 5,
    state,
    updatedAt: new Date().toISOString()
  };

  return getRaceSession();
}

export function startReplaySession(raceId: string): RaceSession {
  return updateRaceSession({
    liveStateBeforeReplay: raceSession.state === 'replaying' ? raceSession.liveStateBeforeReplay : raceSession.state,
    state: 'replaying',
    selectedReplayRaceId: raceId,
    replayPaused: false
  });
}

export function stopReplaySession(): RaceSession {
  return updateRaceSession({
    state: 'replaying',
    replayPaused: true
  });
}

export function clearReplaySession(): RaceSession {
  return updateRaceSession({
    state: raceSession.liveStateBeforeReplay,
    selectedReplayRaceId: null,
    replayPaused: false
  });
}
