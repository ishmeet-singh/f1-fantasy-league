"use client";

import { useState } from "react";

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
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-semibold">Edit Profile</h2>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Display name</label>
        <input
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded bg-slate-800 border border-slate-700 p-2 focus:outline-none focus:border-red-500 transition-colors"
          placeholder="Your name"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors px-4 py-2 text-sm font-medium"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-400">Saved!</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">Something went wrong.</span>
        )}
      </div>
    </form>
  );
}
