import { fetchAllPages } from "@/lib/paginated-query";
import { eligibleDriverIdsForRace } from "@/lib/race-driver-eligibility";
import { isSprintWeekend } from "@/lib/race-weekend";
import { markRaceSessionsScored } from "@/lib/result-sessions";
import { LEGACY_FALLBACK_POSITION, scoreEvent } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { EventType } from "@/lib/types";

const events: EventType[] = ["quali", "sprint", "race"];

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
type ResultSessionStateRow = {
  race_id: string;
  event_type: string;
  status: string;
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
  fetchedPredictions: number;
  fetchedResults: number;
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
  allResults: ResultRow[],
  resultSessions: ResultSessionStateRow[]
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
  const officialSessions = new Set(
    resultSessions
      .filter((session) => session.status === "official")
      .map((session) => `${session.race_id}:${session.event_type}`)
  );

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
        if (!predictions.length || !officialSessions.has(`${race.id}:${eventType}`)) continue;

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

async function persistRaceScores(
  raceId: string,
  scoreRows: ScoreRow[]
): Promise<{ scoreRows: number; weekendRows: number; errors: string[] }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("persist_race_scores", {
    p_race_id: raceId,
    p_scores: scoreRows
  });
  if (error) {
    return {
      scoreRows: 0,
      weekendRows: 0,
      errors: [`race ${raceId} score transaction: ${error.message}`]
    };
  }

  const summary = Array.isArray(data) ? data[0] : data;
  return {
    scoreRows: Number(summary?.score_rows ?? 0),
    weekendRows: Number(summary?.weekend_rows ?? 0),
    errors: []
  };
}

export function buildWeekendRowsForRace(
  raceId: string,
  users: UserRow[],
  scores: ScoreRow[]
): WeekendRow[] {
  const byUser = new Map<string, { points: number; error: number; exact: number }>();
  for (const score of scores) {
    const total = byUser.get(score.user_id) ?? { points: 0, error: 0, exact: 0 };
    total.points += score.points ?? 0;
    total.error += score.total_error ?? 0;
    total.exact += score.exact_matches ?? 0;
    byUser.set(score.user_id, total);
  }

  return users.map((user) => {
    const total = byUser.get(user.id) ?? { points: 0, error: 0, exact: 0 };
    return {
      user_id: user.id,
      race_id: raceId,
      total_points: total.points,
      total_error: total.error,
      exact_matches: total.exact
    };
  });
}

export async function recomputeRaceScores(
  raceId: string,
  options: { forceAvailableResults?: boolean } = {}
): Promise<ScopedRecomputeResult> {
  const supabase = getSupabaseAdmin();
  const { data: race, error: raceError } = await supabase
    .from("race_weekends")
    .select("id,has_sprint,sprint_start")
    .eq("id", raceId)
    .single();
  if (raceError || !race) throw new Error(`race ${raceId}: ${raceError?.message ?? "not found"}`);

  const [predictions, results, resultSessions, raceEntries] = await Promise.all([
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
    ),
    fetchAllPages<ResultSessionStateRow>(`result sessions for race ${raceId}`, (from, to) =>
      supabase
        .from("result_sessions")
        .select("race_id,event_type,status")
        .eq("race_id", raceId)
        .order("event_type")
        .range(from, to)
    ),
    fetchAllPages<{ driver_id: string }>(`entries for race ${raceId}`, (from, to) =>
      supabase
        .from("race_entries")
        .select("driver_id")
        .eq("race_id", raceId)
        .order("driver_id")
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
  const officialEvents = new Set(
    resultSessions
      .filter((session) => session.status === "official")
      .map((session) => session.event_type)
  );
  const completeEvents = events.filter((eventType) => {
    if (eventType === "sprint" && !sprintWeekend) return false;
    const eventResults = resultsByEvent.get(eventType) ?? [];
    return options.forceAvailableResults
      ? eventResults.length > 0
      : officialEvents.has(eventType) && eventResults.length > 0;
  });
  const missingOfficialResults = [...officialEvents].filter(
    (eventType) => (resultsByEvent.get(eventType) ?? []).length === 0
  );
  if (missingOfficialResults.length) {
    return {
      raceId,
      completeEvents,
      fetchedPredictions: predictions.length,
      fetchedResults: results.length,
      scoreRows: 0,
      weekendRows: 0,
      errors: [
        `race ${raceId}: official session metadata has no results for ${missingOfficialResults.join(", ")}`
      ]
    };
  }

  const scoreRows: ScoreRow[] = [];
  const fallbackPosition = Math.max(
    raceEntries.length || LEGACY_FALLBACK_POSITION,
    ...results.map((result) => result.actual_position)
  );
  for (const eventType of completeEvents) {
    const eventResults = resultsByEvent.get(eventType) ?? [];
    for (const [userId, userPredictions] of predictionsByEventAndUser.get(eventType) ?? []) {
      const score = scoreEvent(
        eventType,
        userPredictions,
        eventResults,
        sprintWeekend,
        fallbackPosition
      );
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

  const persisted = await persistRaceScores(raceId, scoreRows);
  if (!persisted.errors.length && persisted.scoreRows !== scoreRows.length) {
    persisted.errors.push(
      `race ${raceId}: expected ${scoreRows.length} score rows, persisted ${persisted.scoreRows}`
    );
  }
  if (!persisted.errors.length) {
    try {
      await markRaceSessionsScored(raceId);
    } catch (error) {
      persisted.errors.push(String(error));
    }
  }
  return {
    raceId,
    completeEvents,
    fetchedPredictions: predictions.length,
    fetchedResults: results.length,
    scoreRows: persisted.scoreRows,
    weekendRows: persisted.weekendRows,
    errors: persisted.errors
  };
}

export async function recomputeAllScores(): Promise<RecomputeResult> {
  const supabase = getSupabaseAdmin();
  const races = await fetchAllPages<RaceRow>("race_weekends", (from, to) =>
    supabase
      .from("race_weekends")
      .select("id,has_sprint,sprint_start")
      .order("id")
      .range(from, to)
  );

  if (!races.length) {
    return {
      scoreRows: 0,
      weekendRows: 0,
      sprintWeekendCount: 0,
      fetchedPredictions: 0,
      fetchedResults: 0,
      errors: ["No races in database"]
    };
  }

  const errors: string[] = [];
  let scoreRows = 0;
  let weekendRows = 0;
  let fetchedPredictions = 0;
  let fetchedResults = 0;
  for (const race of races) {
    const result = await recomputeRaceScores(race.id);
    scoreRows += result.scoreRows;
    weekendRows += result.weekendRows;
    fetchedPredictions += result.fetchedPredictions;
    fetchedResults += result.fetchedResults;
    errors.push(...result.errors);
  }

  return {
    scoreRows,
    weekendRows,
    sprintWeekendCount: races.filter(isSprintWeekend).length,
    fetchedPredictions,
    fetchedResults,
    errors
  };
}
