import { Suspense } from "react";
import { RaceWeekendResults } from "@/components/race-weekend-results";
import { RacePageSkeleton } from "@/components/race-page-skeleton";
import { getRequestUser } from "@/lib/request-user";
import { loadResultsPage } from "@/lib/loaders/results";
import { F1 } from "@/lib/f1-theme";

export const dynamic = "force-dynamic";

export default function ResultsPage({
  searchParams
}: {
  searchParams: { race?: string };
}) {
  const raceKey = searchParams.race ?? "";
  return (
    <Suspense key={raceKey} fallback={<RacePageSkeleton variant="results" />}>
      <ResultsPageContent raceId={searchParams.race} />
    </Suspense>
  );
}

async function ResultsPageContent({ raceId }: { raceId?: string }) {
  const user = getRequestUser();
  const data = await loadResultsPage(user?.id ?? null, raceId);

  if (!data) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center" style={{ boxShadow: F1.cardShadow }}>
        <p className="font-semibold" style={{ color: F1.carbon }}>
          No races loaded yet
        </p>
        <p className="mt-2 text-sm" style={{ color: F1.carbonLight }}>
          An admin needs to run &quot;Sync Season Calendar&quot; first.
        </p>
      </section>
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
