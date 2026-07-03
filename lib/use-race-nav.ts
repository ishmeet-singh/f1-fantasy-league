"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";

/** Race pill navigation with transition + pending pill feedback. */
export function useRaceNav(selectedRaceId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingRaceId, setPendingRaceId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingRaceId && pendingRaceId === selectedRaceId) {
      setPendingRaceId(null);
    }
  }, [selectedRaceId, pendingRaceId]);

  const navigate = useCallback(
    (raceId: string) => {
      if (raceId === selectedRaceId || pendingRaceId === raceId) return;
      setPendingRaceId(raceId);
      startTransition(() => {
        router.push(`${pathname}?race=${raceId}` as Route);
      });
    },
    [pathname, pendingRaceId, router, selectedRaceId, startTransition]
  );

  const isNavigating = isPending || pendingRaceId !== null;

  return { navigate, pendingRaceId, isNavigating };
}
