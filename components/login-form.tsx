"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { F1 } from "@/lib/f1-theme";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo }
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
          style={{ background: F1.redLight, border: `1px solid ${F1.red}33` }}
        >
          ✉️
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: F1.carbon }}>
            Check your inbox
          </h2>
          <p className="mt-2 text-sm" style={{ color: F1.carbonLight }}>
            We sent a sign-in link to{" "}
            <span className="font-semibold" style={{ color: F1.carbon }}>
              {email}
            </span>
          </p>
        </div>
        <p className="text-xs" style={{ color: F1.carbonLight }}>
          Tap the link in your email to sign in. It may take a minute to arrive.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm font-semibold transition hover:opacity-80"
          style={{ color: F1.red }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          className="mb-1 block text-xs font-bold uppercase tracking-wide"
          style={{ color: F1.carbonMid }}
        >
          Email address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D31411]/30"
          style={{
            borderColor: F1.gridLine,
            background: F1.offWhite,
            color: F1.carbon
          }}
        />
      </div>
      {error && (
        <p className="text-sm font-medium" style={{ color: F1.red }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: F1.red }}
      >
        {loading ? "Sending…" : "Send magic link"}
      </button>
      <p className="text-center text-xs" style={{ color: F1.carbonLight }}>
        No password needed — we&apos;ll email you a one-click sign-in link.
      </p>
    </form>
  );
}
