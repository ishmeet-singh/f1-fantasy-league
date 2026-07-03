/** Short label for weekend tiles (e.g. "Bahrain Grand Prix" → "BAH"). */
export function raceShortCode(name: string): string {
  const base = name.replace(/\s*Grand Prix\s*/gi, "").trim();
  const words = base.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
  }
  return base.slice(0, 3).toUpperCase();
}
