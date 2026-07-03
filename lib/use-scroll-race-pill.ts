"use client";

import { useEffect, useRef } from "react";

/** Scroll a horizontal race-pill row so the selected pill sits at the left edge. */
export function useScrollRacePill(selectedRaceId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const scroll = () => {
      const container = containerRef.current;
      const pill = selectedRef.current;
      if (!container || !pill) return;
      container.scrollTo({
        left: pill.offsetLeft - container.offsetLeft,
        behavior: "smooth"
      });
    };
    requestAnimationFrame(scroll);
  }, [selectedRaceId]);

  return { containerRef, selectedRef };
}
