/** True when this weekend uses sprint scoring (extra session + reduced caps). */
export function isSprintWeekend(race: {
  has_sprint?: boolean | null;
  sprint_start?: string | null;
}): boolean {
  return Boolean(race.has_sprint) || Boolean(race.sprint_start);
}
