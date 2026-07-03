import { RaceWeekendResults } from "@/components/race-weekend-results";
import { getRequestUser } from "@/lib/request-user";
import { loadResultsPage } from "@/lib/loaders/results";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const user = getRequestUser();
  const data = await loadResultsPage(user?.id ?? null, searchParams.race);

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Results</h1>
        <div className="card text-center py-10 space-y-2">
          <p className="text-slate-400">No races loaded yet.</p>
          <p className="text-slate-600 text-sm">An admin needs to run &quot;Sync Season Calendar&quot; first.</p>
        </div>
      </div>
    );
  }

  const {
    races,
    selectedRace,
    raceIdsWithResults,
    resultsByEvent,
    myPicks,
    myScores,
    leaguePlayers,
    currentUserId
  } = data;

  const now = new Date().toISOString();

  return (
    <RaceWeekendResults
      races={races.map((r, i) => ({
        id: r.id,
        grand_prix: r.grand_prix,
        round: i + 1,
        isPast: r.race_start <= now,
        hasResults: raceIdsWithResults.has(r.id)
      }))}
      selectedRace={selectedRace}
      resultsByEvent={resultsByEvent}
      myPicks={myPicks}
      myScores={myScores}
      leaguePlayers={leaguePlayers}
      currentUserId={currentUserId}
    />
  );
}
