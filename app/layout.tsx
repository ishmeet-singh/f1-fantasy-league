import "./globals.css";
import { ReactNode } from "react";
import { createServerSupabase } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { Nav } from "@/components/nav";

export default async function RootLayout({ children }: { children: ReactNode }) {
  let user = null;
  let admin = false;
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    admin = isAdminEmail(user?.email || "");
  } catch {
    // unauthenticated — login page renders without nav
  }

  return (
    <html lang="en">
      <body>
        {user && <Nav email={user.email || ""} isAdmin={admin} />}
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}
