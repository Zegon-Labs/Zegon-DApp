export type TournamentPhaseStatus = "upcoming" | "active" | "ended";

export interface TournamentPhase {
  id: string;
  nameEn: string;
  nameEs: string;
  startAt: number;
  endAt: number;
}

/** Single source of truth — edit dates here only. endAt is exclusive (UTC). */
export const TOURNAMENT_PHASES: readonly TournamentPhase[] = [
  {
    id: "s1",
    nameEn: "Season 1 — Quarter Finals",
    nameEs: "Season 1 — Cuartos de final",
    startAt: Date.parse("2026-07-09T00:00:00.000Z"),
    endAt: Date.parse("2026-07-13T00:00:00.000Z"),
  },
  {
    id: "s2",
    nameEn: "Season 2 — Semi Finals",
    nameEs: "Season 2 — Semifinales",
    startAt: Date.parse("2026-07-13T00:00:00.000Z"),
    endAt: Date.parse("2026-07-16T00:00:00.000Z"),
  },
  {
    id: "s3",
    nameEn: "Season 3 — Finals",
    nameEs: "Season 3 — Final",
    startAt: Date.parse("2026-07-16T00:00:00.000Z"),
    endAt: Date.parse("2026-07-20T00:00:00.000Z"),
  },
] as const;

export interface TournamentPhaseInfo {
  status: TournamentPhaseStatus;
  phase: TournamentPhase | null;
  msRemaining: number;
  tournamentStartAt: number;
  tournamentEndAt: number;
}

export function getTournamentPhaseInfo(now = Date.now()): TournamentPhaseInfo {
  const tournamentStartAt = TOURNAMENT_PHASES[0]!.startAt;
  const tournamentEndAt = TOURNAMENT_PHASES[TOURNAMENT_PHASES.length - 1]!.endAt;

  if (now >= tournamentEndAt) {
    return {
      status: "ended",
      phase: null,
      msRemaining: 0,
      tournamentStartAt,
      tournamentEndAt,
    };
  }

  if (now < tournamentStartAt) {
    return {
      status: "upcoming",
      phase: TOURNAMENT_PHASES[0]!,
      msRemaining: Math.max(0, tournamentStartAt - now),
      tournamentStartAt,
      tournamentEndAt,
    };
  }

  for (const phase of TOURNAMENT_PHASES) {
    if (now >= phase.startAt && now < phase.endAt) {
      return {
        status: "active",
        phase,
        msRemaining: Math.max(0, phase.endAt - now),
        tournamentStartAt,
        tournamentEndAt,
      };
    }
  }

  return {
    status: "ended",
    phase: null,
    msRemaining: 0,
    tournamentStartAt,
    tournamentEndAt,
  };
}

export function isTournamentActive(now = Date.now()): boolean {
  const info = getTournamentPhaseInfo(now);
  return info.status === "active";
}
