"use client";

import { useEffect, useState } from "react";
export { SESSION_OPTS, LONG_OPTS } from "@/lib/date-formats";

type Options = Intl.DateTimeFormatOptions;

const DEFAULT_OPTS: Options = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true
};

export function LocalTime({ iso, opts = DEFAULT_OPTS }: { iso: string; opts?: Options }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    setLabel(new Date(iso).toLocaleString(undefined, opts));
  }, [iso, opts]);

  return <span suppressHydrationWarning>{label}</span>;
}
