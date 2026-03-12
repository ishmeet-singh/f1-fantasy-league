import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { LoginForm } from "@/components/login-form";
import { HashAuthHandler } from "@/components/hash-auth-handler";

export default async function Home({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const linkExpired = searchParams.error === "link_expired";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Handles admin-generated magic links that arrive as #access_token= hash */}
      <HashAuthHandler />
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 border border-red-600/40 mb-2">
            <span className="text-2xl">🏎️</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">F1 Friends League</h1>
          <p className="text-slate-400 text-sm">The private F1 fantasy prediction league</p>
        </div>
        {linkExpired && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
            That sign-in link has expired or already been used. Enter your email below to get a fresh one.
          </div>
        )}
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
