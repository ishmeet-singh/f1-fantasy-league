"use client";

import { useEffect, useState } from "react";

export function LocalTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    );
  }, [iso]);

  return <span suppressHydrationWarning>{label}</span>;
}
