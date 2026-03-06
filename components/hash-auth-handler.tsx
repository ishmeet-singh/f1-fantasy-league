"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

/**
 * Handles the implicit-flow magic link that Supabase admin generateLink() produces.
 * The token arrives as a URL hash fragment (#access_token=...&refresh_token=...)
 * which the server never sees. We detect it client-side, set the session, then redirect.
 */
export function HashAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (!error) {
          // Full page reload so the server re-renders layout with the new session (nav appears)
          window.location.href = "/dashboard";
        }
      });
  }, [router]);

  return null;
}
