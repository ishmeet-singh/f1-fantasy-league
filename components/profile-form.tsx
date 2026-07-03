"use client";

import { useState } from "react";
import { F1 } from "@/lib/f1-theme";

export function ProfileForm({
  initialName,
  onSaved
}: {
  initialName: string;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name.trim() })
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("saved");
      onSaved(name.trim());
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-4"
      style={{ boxShadow: F1.cardShadow }}
    >
      <h2 className="font-bold" style={{ color: F1.carbon }}>
        Edit profile
      </h2>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide" style={{ color: F1.carbonMid }}>
          Display name
        </label>
        <input
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border p-3 text-sm transition focus:outline-none focus:ring-2"
          style={{
            borderColor: F1.gridLine,
            color: F1.carbon,
            background: F1.offWhite
          }}
          placeholder="Your name"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: F1.red }}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "#166534" }}>
            ✓ Saved!
          </span>
        )}
        {status === "error" && (
          <span className="text-sm" style={{ color: F1.red }}>
            Something went wrong.
          </span>
        )}
      </div>
    </form>
  );
}
