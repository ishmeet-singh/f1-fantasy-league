/** Static sample data for UI previews only — not wired to production. */

export type PreviewRace = {
  id: string;
  name: string;
  short: string;
  points: number;
  dropped: boolean;
};

export type PreviewPlayer = {
  id: string;
  name: string;
  isYou?: boolean;
  rank: number;
  score: number;
  exact: number;
  racesCounting: number;
  racesDropped: number;
  races: PreviewRace[];
};

export const STANDINGS_SUBTITLE = "Best 4 of 8 counting · worst 4 dropped";

export const SEASON = { past: 8, total: 22 };

export const NEXT_RACE = {
  grandPrix: "British Grand Prix",
  circuit: "Silverstone",
  quali: "Sat 14:00",
  race: "Sun 15:00",
  countdown: "2d 14h",
  picksSubmitted: true
};

export const LEADERBOARD: PreviewPlayer[] = [
  {
    id: "u1",
    name: "Ishmeet",
    isYou: true,
    rank: 1,
    score: 412,
    exact: 14,
    racesCounting: 4,
    racesDropped: 4,
    races: [
      { id: "r1", name: "Australia", short: "AUS", points: 118, dropped: false },
      { id: "r2", name: "China", short: "CHN", points: 104, dropped: false },
      { id: "r3", name: "Japan", short: "JPN", points: 98, dropped: false },
      { id: "r4", name: "Bahrain", short: "BHR", points: 92, dropped: false },
      { id: "r5", name: "Saudi Arabia", short: "KSA", points: 61, dropped: true },
      { id: "r6", name: "Miami", short: "MIA", points: 54, dropped: true },
      { id: "r7", name: "Emilia-Romagna", short: "EMR", points: 48, dropped: true },
      { id: "r8", name: "Monaco", short: "MON", points: 31, dropped: true }
    ]
  },
  {
    id: "u2",
    name: "Arjun",
    rank: 2,
    score: 398,
    exact: 11,
    racesCounting: 4,
    racesDropped: 4,
    races: [
      { id: "r1", name: "Australia", short: "AUS", points: 110, dropped: false },
      { id: "r2", name: "China", short: "CHN", points: 102, dropped: false },
      { id: "r3", name: "Japan", short: "JPN", points: 95, dropped: false },
      { id: "r4", name: "Bahrain", short: "BHR", points: 91, dropped: false },
      { id: "r5", name: "Saudi Arabia", short: "KSA", points: 72, dropped: true },
      { id: "r6", name: "Miami", short: "MIA", points: 58, dropped: true },
      { id: "r7", name: "Emilia-Romagna", short: "EMR", points: 44, dropped: true },
      { id: "r8", name: "Monaco", short: "MON", points: 39, dropped: true }
    ]
  },
  {
    id: "u3",
    name: "Priya",
    rank: 3,
    score: 385,
    exact: 9,
    racesCounting: 4,
    racesDropped: 4,
    races: [
      { id: "r1", name: "Australia", short: "AUS", points: 108, dropped: false },
      { id: "r2", name: "China", short: "CHN", points: 99, dropped: false },
      { id: "r3", name: "Japan", short: "JPN", points: 91, dropped: false },
      { id: "r4", name: "Bahrain", short: "BHR", points: 87, dropped: false },
      { id: "r5", name: "Saudi Arabia", short: "KSA", points: 65, dropped: true },
      { id: "r6", name: "Miami", short: "MIA", points: 52, dropped: true },
      { id: "r7", name: "Emilia-Romagna", short: "EMR", points: 41, dropped: true },
      { id: "r8", name: "Monaco", short: "MON", points: 35, dropped: true }
    ]
  },
  {
    id: "u4",
    name: "Rohan",
    rank: 4,
    score: 371,
    exact: 8,
    racesCounting: 4,
    racesDropped: 4,
    races: [
      { id: "r1", name: "Australia", short: "AUS", points: 102, dropped: false },
      { id: "r2", name: "China", short: "CHN", points: 96, dropped: false },
      { id: "r3", name: "Japan", short: "JPN", points: 88, dropped: false },
      { id: "r4", name: "Bahrain", short: "BHR", points: 85, dropped: false },
      { id: "r5", name: "Saudi Arabia", short: "KSA", points: 70, dropped: true },
      { id: "r6", name: "Miami", short: "MIA", points: 49, dropped: true },
      { id: "r7", name: "Emilia-Romagna", short: "EMR", points: 38, dropped: true },
      { id: "r8", name: "Monaco", short: "MON", points: 28, dropped: true }
    ]
  }
];

export const CHART_RACES = ["AUS", "CHN", "JPN", "BHR", "KSA", "MIA", "EMR", "MON"];

export const CHART_LINES = [
  { name: "Ishmeet", color: "#DC2626", values: [118, 222, 320, 412, 412, 412, 412, 412] },
  { name: "Arjun", color: "#2563EB", values: [110, 212, 307, 398, 398, 398, 398, 398] },
  { name: "Priya", color: "#059669", values: [108, 207, 298, 385, 385, 385, 385, 385] }
];

export const PICK_DRIVERS = [
  { id: "d1", name: "Norris", team: "McLaren" },
  { id: "d2", name: "Piastri", team: "McLaren" },
  { id: "d3", name: "Verstappen", team: "Red Bull" },
  { id: "d4", name: "Russell", team: "Mercedes" },
  { id: "d5", name: "Leclerc", team: "Ferrari" },
  { id: "d6", name: "Hamilton", team: "Ferrari" },
  { id: "d7", name: "Antonelli", team: "Mercedes" },
  { id: "d8", name: "Alonso", team: "Aston Martin" }
];

export const QUALI_PICKS = ["Norris", "Piastri", "Verstappen"];
