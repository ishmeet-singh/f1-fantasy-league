import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AdminPanel } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await assertAdmin();
  const supabase = getSupabaseAdmin();

  const { data: users } = await supabase
    .from("users")
    .select("id,email,display_name,created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <a
          href="/admin/picks"
          className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-sm font-medium transition-colors"
        >
          Pick Monitor →
        </a>
      </div>
      <AdminPanel initialPlayers={users || []} />
    </div>
  );
}
