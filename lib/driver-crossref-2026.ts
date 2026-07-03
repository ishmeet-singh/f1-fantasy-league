/**
 * 2026 F1 grid — permanent number (OpenF1 driver_number), Jolpi driverId, FIA code.
 * Source: Jolpi/Ergast 2026 standings + Australian GP results (permanentNumber).
 */
export type DriverCrossrefEntry = {
  openf1_id: string;
  jolpi_id: string;
  code: string;
  canonical_name: string;
};

export const DRIVER_CROSSREF_2026: DriverCrossrefEntry[] = [
  { openf1_id: "1", jolpi_id: "norris", code: "NOR", canonical_name: "Lando Norris" },
  { openf1_id: "3", jolpi_id: "max_verstappen", code: "VER", canonical_name: "Max Verstappen" },
  { openf1_id: "5", jolpi_id: "bortoleto", code: "BOR", canonical_name: "Gabriel Bortoleto" },
  { openf1_id: "6", jolpi_id: "hadjar", code: "HAD", canonical_name: "Isack Hadjar" },
  { openf1_id: "10", jolpi_id: "gasly", code: "GAS", canonical_name: "Pierre Gasly" },
  { openf1_id: "11", jolpi_id: "perez", code: "PER", canonical_name: "Sergio Pérez" },
  { openf1_id: "12", jolpi_id: "antonelli", code: "ANT", canonical_name: "Andrea Kimi Antonelli" },
  { openf1_id: "14", jolpi_id: "alonso", code: "ALO", canonical_name: "Fernando Alonso" },
  { openf1_id: "16", jolpi_id: "leclerc", code: "LEC", canonical_name: "Charles Leclerc" },
  { openf1_id: "18", jolpi_id: "stroll", code: "STR", canonical_name: "Lance Stroll" },
  { openf1_id: "23", jolpi_id: "albon", code: "ALB", canonical_name: "Alexander Albon" },
  { openf1_id: "27", jolpi_id: "hulkenberg", code: "HUL", canonical_name: "Nico Hülkenberg" },
  { openf1_id: "30", jolpi_id: "lawson", code: "LAW", canonical_name: "Liam Lawson" },
  { openf1_id: "31", jolpi_id: "ocon", code: "OCO", canonical_name: "Esteban Ocon" },
  { openf1_id: "41", jolpi_id: "arvid_lindblad", code: "LIN", canonical_name: "Arvid Lindblad" },
  { openf1_id: "43", jolpi_id: "colapinto", code: "COL", canonical_name: "Franco Colapinto" },
  { openf1_id: "44", jolpi_id: "hamilton", code: "HAM", canonical_name: "Lewis Hamilton" },
  { openf1_id: "55", jolpi_id: "sainz", code: "SAI", canonical_name: "Carlos Sainz" },
  { openf1_id: "63", jolpi_id: "russell", code: "RUS", canonical_name: "George Russell" },
  { openf1_id: "77", jolpi_id: "bottas", code: "BOT", canonical_name: "Valtteri Bottas" },
  { openf1_id: "81", jolpi_id: "piastri", code: "PIA", canonical_name: "Oscar Piastri" },
  { openf1_id: "87", jolpi_id: "bearman", code: "BEA", canonical_name: "Oliver Bearman" }
];
