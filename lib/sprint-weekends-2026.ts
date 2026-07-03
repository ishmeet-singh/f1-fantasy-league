/**
 * Official 2026 F1 Sprint calendar (FIA / formula1.com, announced 2025).
 * China, Miami, Canada, Great Britain, Netherlands, Singapore — six weekends.
 */
const SPRINT_2026_NAME_PATTERNS: RegExp[] = [
  /chinese|china/i,
  /miami/i,
  /canadian|canada|montreal/i,
  /british|great britain|united kingdom|silverstone/i,
  /dutch|netherlands|zandvoort/i,
  /singapore/i
];

export function isOfficialSprintWeekend2026(grandPrix: string, year = 2026): boolean {
  if (year !== 2026) return false;
  return SPRINT_2026_NAME_PATTERNS.some((pattern) => pattern.test(grandPrix));
}

export type SprintWeekendFields = {
  grand_prix: string;
  quali_start: string;
  sprint_start: string | null;
  race_start: string;
  has_sprint: boolean;
};

/** Hours before qualifying that the sprint typically starts on sprint weekends. */
const SPRINT_BEFORE_QUALI_HOURS = 4;

/**
 * If OpenF1 omits the Sprint session, pin has_sprint and derive sprint_start from quali.
 * Does not overwrite an existing sprint_start from the API.
 */
export function applyOfficialSprintWeekend2026(
  race: SprintWeekendFields,
  year = 2026
): SprintWeekendFields {
  if (!isOfficialSprintWeekend2026(race.grand_prix, year)) return race;
  if (race.has_sprint && race.sprint_start) return race;

  const qualiMs = new Date(race.quali_start).getTime();
  const sprintStart = new Date(qualiMs - SPRINT_BEFORE_QUALI_HOURS * 60 * 60 * 1000).toISOString();

  return {
    ...race,
    sprint_start: race.sprint_start ?? sprintStart,
    has_sprint: true
  };
}
