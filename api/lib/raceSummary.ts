import prisma from './prisma.js';

export interface RaceLoonWinner {
  userId: number;
  name: string;
  loons: number;
  isTop: boolean;
}

export interface CanonicalRaceSummary {
  raceId: string;
  winningHorseId: number | null;
  winningHorseName: string | null;
  winningHorseBodyHex: string | null;
  winningHorseSaddleHex: string | null;
  loonWinners: RaceLoonWinner[];
  topLoonWinner: RaceLoonWinner | null;
}

function formatUserName(user: { nickname: string | null; firstName: string | null; lastName: string | null }): string {
  return user.nickname || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export async function buildCanonicalRaceSummary(raceId: bigint): Promise<CanonicalRaceSummary> {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    select: {
      id: true,
      results: {
        where: { position: { lte: 3 } },
        orderBy: { position: 'asc' },
        select: {
          position: true,
          horseId: true,
          horse: {
            select: {
              name: true,
              bodyHex: true,
              saddleHex: true
            }
          }
        }
      },
      bets: {
        select: {
          amount: true,
          horseId: true,
          user: {
            select: {
              id: true,
              nickname: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });

  if (!race) {
    return {
      raceId: raceId.toString(),
      winningHorseId: null,
      winningHorseName: null,
      winningHorseBodyHex: null,
      winningHorseSaddleHex: null,
      loonWinners: [],
      topLoonWinner: null
    };
  }

  const multiplierByHorse = new Map<number, number>();
  race.results.forEach((result) => {
    if (result.position === 1) multiplierByHorse.set(result.horseId, 3);
    else if (result.position === 2) multiplierByHorse.set(result.horseId, 2);
    else if (result.position === 3) multiplierByHorse.set(result.horseId, 1.5);
  });

  const winningsByUser = new Map<number, { userId: number; name: string; loons: number }>();

  race.bets.forEach((bet) => {
    const multiplier = multiplierByHorse.get(bet.horseId);
    if (!multiplier) return;

    const winnings = Math.floor(bet.amount * multiplier);
    const existing = winningsByUser.get(bet.user.id);

    if (existing) {
      existing.loons += winnings;
    } else {
      winningsByUser.set(bet.user.id, {
        userId: bet.user.id,
        name: formatUserName(bet.user),
        loons: winnings
      });
    }
  });

  const loonWinners: RaceLoonWinner[] = Array.from(winningsByUser.values())
    .sort((a, b) => b.loons - a.loons)
    .map((entry, idx) => ({ ...entry, isTop: idx === 0 }));

  const winnerResult = race.results.find((result) => result.position === 1) || null;

  return {
    raceId: race.id.toString(),
    winningHorseId: winnerResult?.horseId ?? null,
    winningHorseName: winnerResult?.horse.name ?? null,
    winningHorseBodyHex: winnerResult?.horse.bodyHex ?? null,
    winningHorseSaddleHex: winnerResult?.horse.saddleHex ?? null,
    loonWinners,
    topLoonWinner: loonWinners[0] || null
  };
}
