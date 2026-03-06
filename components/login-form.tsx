"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

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
      <div className="text-center space-y-3">
        <div className="text-4xl">📬</div>
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-slate-400 text-sm">
          We sent a sign-in link to <span className="text-slate-200">{email}</span>
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-slate-500 underline hover:text-slate-300"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 font-semibold transition-colors"
      >
        {loading ? "Sending…" : "Send magic link"}
      </button>
      <p className="text-center text-xs text-slate-500">
        No password needed — we&apos;ll email you a one-click sign-in link.
      </p>
    </form>
  );
}
