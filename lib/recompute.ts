import { fetchAllPages } from "@/lib/paginated-query";
import { eligibleDriverIdsForRace } from "@/lib/race-driver-eligibility";
import { isSprintWeekend } from "@/lib/race-weekend";
import { scoreEvent } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { EventType } from "@/lib/types";

const events: EventType[] = ["quali", "sprint", "race"];
const WRITE_BATCH_SIZE = 500;

type RaceRow = {
  id: string;
  has_sprint: boolean | null;
  sprint_start: string | null;
};
type UserRow = { id: string };
type PredictionRow = {
  user_id: string;
  race_id: string;
  event_type: string;
  driver_id: string;
  predicted_position: number;
};
type ResultRow = {
  race_id: string;
  event_type: string;
  driver_id: string;
  actual_position: number;
};
type ScoreRow = {
  user_id: string;
  race_id: string;
  event_type: string;
  points: number;
  total_error: number;
  exact_matches: number;
};
type WeekendRow = {
  user_id: string;
  race_id: string;
  total_points: number;
  total_error: number;
  exact_matches: number;
};

export type RecomputeResult = {
  scoreRows: number;
  weekendRows: number;
  sprintWeekendCount: number;
  fetchedPredictions: number;
  fetchedResults: number;
  errors: string[];
};

export type ScopedRecomputeResult = {
  raceId: string;
  completeEvents: EventType[];
  scoreRows: number;
  weekendRows: number;
  errors: string[];
};

export function hasCompleteResults(
  raceId: string,
  results: ReadonlyArray<{ driver_id: string }>
): boolean {
  if (raceId.startsWith("jolpi-")) {
    return new Set(results.map((row) => String(row.driver_id))).size >= 22;
  }
  const expected = eligibleDriverIdsForRace(raceId);
  const actual = new Set(results.map((row) => String(row.driver_id)));
  return [...expected].every((driverId) => actual.has(driverId));
}

export function buildRecomputeRows(
  races: RaceRow[],
  users: UserRow[],
  allPreds: PredictionRow[],
  allResults: ResultRow[]
): { scoreRows: ScoreRow[]; weekendRows: WeekendRow[]; sprintWeekendCount: number } {
  type Pred = { driver_id: string; predicted_position: number };
  type Res = { driver_id: string; actual_position: number };

  const predIndex = new Map<string, Map<string, Map<string, Pred[]>>>();
  for (const prediction of allPreds) {
    if (!predIndex.has(prediction.race_id)) predIndex.set(prediction.race_id, new Map());
    const byEvent = predIndex.get(prediction.race_id)!;
    if (!byEvent.has(prediction.event_type)) byEvent.set(prediction.event_type, new Map());
    const byUser = byEvent.get(prediction.event_type)!;
    if (!byUser.has(prediction.user_id)) byUser.set(prediction.user_id, []);
    byUser.get(prediction.user_id)!.push({
      driver_id: prediction.driver_id,
      predicted_position: prediction.predicted_position
    });
  }

  const resultIndex = new Map<string, Map<string, Res[]>>();
  for (const result of allResults) {
    if (!resultIndex.has(result.race_id)) resultIndex.set(result.race_id, new Map());
    const byEvent = resultIndex.get(result.race_id)!;
    if (!byEvent.has(result.event_type)) byEvent.set(result.event_type, []);
    byEvent.get(result.event_type)!.push({
      driver_id: result.driver_id,
      actual_position: result.actual_position
    });
  }

  const scoreRows: ScoreRow[] = [];
  const weekendRows: WeekendRow[] = [];

  for (const race of races) {
    const sprintWeekend = isSprintWeekend(race);

    for (const user of users) {
      let weekendPoints = 0;
      let weekendError = 0;
      let weekendExact = 0;

      for (const eventType of events) {
        if (eventType === "sprint" && !sprintWeekend) continue;

        const predictions = predIndex.get(race.id)?.get(eventType)?.get(user.id) ?? [];
        const results = resultIndex.get(race.id)?.get(eventType) ?? [];
        if (!predictions.length || !hasCompleteResults(race.id, results)) continue;

        const score = scoreEvent(eventType, predictions, results, sprintWeekend);
        weekendPoints += score.points;
        weekendError += score.totalError;
        weekendExact += score.exactMatches;
        scoreRows.push({
          user_id: user.id,
          race_id: race.id,
          event_type: eventType,
          points: score.points,
          total_error: score.totalError,
          exact_matches: score.exactMatches
        });
      }

      weekendRows.push({
        user_id: user.id,
        race_id: race.id,
        total_points: weekendPoints,
        total_error: weekendError,
        exact_matches: weekendExact
      });
    }
  }

  return {
    scoreRows,
    weekendRows,
    sprintWeekendCount: races.filter(isSprintWeekend).length
  };
}

async function upsertInBatches(
  table: "scores" | "weekend_scores",
  rows: ScoreRow[] | WeekendRow[],
  onConflict: string
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];

  for (let from = 0; from < rows.length; from += WRITE_BATCH_SIZE) {
    const batch = rows.slice(from, from + WRITE_BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) errors.push(`${table} upsert batch ${from / WRITE_BATCH_SIZE + 1}: ${error.message}`);
  }

  return errors;
}

async function deleteIncompleteEventScores(
  raceId: string,
  incompleteEvents: EventType[]
): Promise<string[]> {
  if (!incompleteEvents.length) return [];

  const { error } = await getSupabaseAdmin()
    .from("scores")
    .delete()
    .eq("race_id", raceId)
    .in("event_type", incompleteEvents);

  return error ? [`scores cleanup for race ${raceId}: ${error.message}`] : [];
}

async function rebuildWeekendScoresForRace(raceId: string): Promise<{ rows: number; errors: string[] }> {
  const supabase = getSupabaseAdmin();
  const [users, scores] = await Promise.all([
    fetchAllPages<UserRow>("users", (from, to) =>
      supabase.from("users").select("id").order("id").range(from, to)
    ),
    fetchAllPages<ScoreRow>(`scores for race ${raceId}`, (from, to) =>
      supabase
        .from("scores")
        .select("user_id,race_id,event_type,points,total_error,exact_matches")
        .eq("race_id", raceId)
        .order("id")
        .range(from, to)
    )
  ]);

  const byUser = new Map<string, { points: number; error: number; exact: number }>();
  for (const score of scores) {
    const total = byUser.get(score.user_id) ?? { points: 0, error: 0, exact: 0 };
    total.points += score.points ?? 0;
    total.error += score.total_error ?? 0;
    total.exact += score.exact_matches ?? 0;
    byUser.set(score.user_id, total);
  }

  const rows: WeekendRow[] = users.map((user) => {
    const total = byUser.get(user.id) ?? { points: 0, error: 0, exact: 0 };
    return {
      user_id: user.id,
      race_id: raceId,
      total_points: total.points,
      total_error: total.error,
      exact_matches: total.exact
    };
  });

  return {
    rows: rows.length,
    errors: await upsertInBatches("weekend_scores", rows, "user_id,race_id")
  };
}

export async function recomputeRaceScores(raceId: string): Promise<ScopedRecomputeResult> {
  const supabase = getSupabaseAdmin();
  const { data: race, error: raceError } = await supabase
    .from("race_weekends")
    .select("id,has_sprint,sprint_start")
    .eq("id", raceId)
    .single();
  if (raceError || !race) throw new Error(`race ${raceId}: ${raceError?.message ?? "not found"}`);

  const [predictions, results] = await Promise.all([
    fetchAllPages<PredictionRow>(`predictions for race ${raceId}`, (from, to) =>
      supabase
        .from("predictions")
        .select("user_id,race_id,event_type,driver_id,predicted_position")
        .eq("race_id", raceId)
        .order("id")
        .range(from, to)
    ),
    fetchAllPages<ResultRow>(`results for race ${raceId}`, (from, to) =>
      supabase
        .from("results")
        .select("race_id,event_type,driver_id,actual_position")
        .eq("race_id", raceId)
        .order("id")
        .range(from, to)
    )
  ]);

  const predictionsByEventAndUser = new Map<string, Map<string, PredictionRow[]>>();
  for (const prediction of predictions) {
    if (!predictionsByEventAndUser.has(prediction.event_type)) {
      predictionsByEventAndUser.set(prediction.event_type, new Map());
    }
    const byUser = predictionsByEventAndUser.get(prediction.event_type)!;
    if (!byUser.has(prediction.user_id)) byUser.set(prediction.user_id, []);
    byUser.get(prediction.user_id)!.push(prediction);
  }

  const resultsByEvent = new Map<string, ResultRow[]>();
  for (const result of results) {
    if (!resultsByEvent.has(result.event_type)) resultsByEvent.set(result.event_type, []);
    resultsByEvent.get(result.event_type)!.push(result);
  }

  const sprintWeekend = isSprintWeekend(race);
  const completeEvents = events.filter((eventType) => {
    if (eventType === "sprint" && !sprintWeekend) return false;
    return hasCompleteResults(raceId, resultsByEvent.get(eventType) ?? []);
  });
  const incompleteEvents = events.filter((eventType) => {
    const eventResults = resultsByEvent.get(eventType) ?? [];
    return eventResults.length > 0 && !completeEvents.includes(eventType);
  });
  const cleanupErrors = await deleteIncompleteEventScores(raceId, incompleteEvents);
  if (cleanupErrors.length) {
    return { raceId, completeEvents, scoreRows: 0, weekendRows: 0, errors: cleanupErrors };
  }

  const scoreRows: ScoreRow[] = [];
  for (const eventType of completeEvents) {
    const eventResults = resultsByEvent.get(eventType) ?? [];
    for (const [userId, userPredictions] of predictionsByEventAndUser.get(eventType) ?? []) {
      const score = scoreEvent(eventType, userPredictions, eventResults, sprintWeekend);
      scoreRows.push({
        user_id: userId,
        race_id: raceId,
        event_type: eventType,
        points: score.points,
        total_error: score.totalError,
        exact_matches: score.exactMatches
      });
    }
  }

  const errors = await upsertInBatches("scores", scoreRows, "user_id,race_id,event_type");
  if (errors.length) {
    return { raceId, completeEvents, scoreRows: scoreRows.length, weekendRows: 0, errors };
  }

  const weekend = await rebuildWeekendScoresForRace(raceId);
  return {
    raceId,
    completeEvents,
    scoreRows: scoreRows.length,
    weekendRows: weekend.rows,
    errors: weekend.errors
  };
}

export async function recomputeAllScores(): Promise<RecomputeResult> {
  const supabase = getSupabaseAdmin();
  const [races, users, allPreds, allResults] = await Promise.all([
    fetchAllPages<RaceRow>("race_weekends", (from, to) =>
      supabase.from("race_weekends").select("id,has_sprint,sprint_start").order("id").range(from, to)
    ),
    fetchAllPages<UserRow>("users", (from, to) =>
      supabase.from("users").select("id").order("id").range(from, to)
    ),
    fetchAllPages<PredictionRow>("predictions", (from, to) =>
      supabase
        .from("predictions")
        .select("user_id,race_id,event_type,driver_id,predicted_position")
        .order("id")
        .range(from, to)
    ),
    fetchAllPages<ResultRow>("results", (from, to) =>
      supabase
        .from("results")
        .select("race_id,event_type,driver_id,actual_position")
        .order("id")
        .range(from, to)
    )
  ]);

  if (!races.length || !users.length) {
    return {
      scoreRows: 0,
      weekendRows: 0,
      sprintWeekendCount: 0,
      fetchedPredictions: allPreds.length,
      fetchedResults: allResults.length,
      errors: ["No races or users in database"]
    };
  }

  const built = buildRecomputeRows(races, users, allPreds, allResults);
  const resultsByRaceAndEvent = new Map<string, Map<string, ResultRow[]>>();
  for (const result of allResults) {
    if (!resultsByRaceAndEvent.has(result.race_id)) resultsByRaceAndEvent.set(result.race_id, new Map());
    const byEvent = resultsByRaceAndEvent.get(result.race_id)!;
    if (!byEvent.has(result.event_type)) byEvent.set(result.event_type, []);
    byEvent.get(result.event_type)!.push(result);
  }
  const cleanupErrors: string[] = [];
  for (const [raceId, byEvent] of resultsByRaceAndEvent) {
    const incompleteEvents = events.filter((eventType) => {
      const eventResults = byEvent.get(eventType) ?? [];
      return eventResults.length > 0 && !hasCompleteResults(raceId, eventResults);
    });
    cleanupErrors.push(...(await deleteIncompleteEventScores(raceId, incompleteEvents)));
  }

  const errors = [
    ...cleanupErrors,
    ...(await upsertInBatches("scores", built.scoreRows, "user_id,race_id,event_type")),
    ...(await upsertInBatches("weekend_scores", built.weekendRows, "user_id,race_id"))
  ];

  return {
    scoreRows: built.scoreRows.length,
    weekendRows: built.weekendRows.length,
    sprintWeekendCount: built.sprintWeekendCount,
    fetchedPredictions: allPreds.length,
    fetchedResults: allResults.length,
    errors
  };
}
