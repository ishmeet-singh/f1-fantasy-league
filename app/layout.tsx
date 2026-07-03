import "./globals.css";
import { ReactNode } from "react";
import { getRequestUser } from "@/lib/request-user";
import { isAdminEmail } from "@/lib/admin";
import { Nav } from "@/components/nav";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestUser = getRequestUser();

  return (
    <html lang="en">
      <body>
        {requestUser && (
          <Nav email={requestUser.email} isAdmin={isAdminEmail(requestUser.email)} />
        )}
        <main className="mx-auto max-w-5xl p-4 pb-20 md:pb-4">{children}</main>
      </body>
    </html>
  );
}
