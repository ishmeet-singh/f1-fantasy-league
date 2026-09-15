import type { EventType } from "@/lib/types";

/** Single source of truth for the number of picks submitted per session. */
export const PICKS_REQUIRED: Readonly<Record<EventType, number>> = {
  quali: 3,
  sprint: 10,
  race: 10
};
