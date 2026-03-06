"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import type { Route } from "next";

type NavProps = {
  email: string;
  isAdmin: boolean;
};

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/picks", label: "Make Picks" },
  { href: "/results", label: "Results" },
  { href: "/rules", label: "Rules" },
  { href: "/profile", label: "Profile" }
];

export function Nav({ email, isAdmin }: NavProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-0 text-sm">
        <Link href="/dashboard" className="mr-3 py-4 font-bold text-white text-base tracking-tight flex-shrink-0">
          F1 <span className="text-red-500">League</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href as Route}
                className={`px-3 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-red-500 text-white font-medium"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-4 border-b-2 transition-colors whitespace-nowrap ${
                pathname.startsWith("/admin")
                  ? "border-red-500 text-white font-medium"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
          <span className="text-xs text-slate-600 hidden md:inline truncate max-w-[160px]">{email}</span>
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
