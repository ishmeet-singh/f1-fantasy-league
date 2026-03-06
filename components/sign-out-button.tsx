"use client";

import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
    >
      Sign out
    </button>
  );
}
