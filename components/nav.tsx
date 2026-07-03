"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { AppBrand } from "@/components/f1-logo";
import { F1 } from "@/lib/f1-theme";
import type { Route } from "next";

type NavProps = {
  email: string;
  isAdmin: boolean;
};

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Home", mobileLabel: "Home" },
  { href: "/picks", label: "Make Picks", mobileLabel: "Picks" },
  { href: "/results", label: "Results", mobileLabel: "Results" },
  { href: "/rules", label: "Rules", mobileLabel: "Rules" },
  { href: "/profile", label: "Profile", mobileLabel: "Profile" }
] as const;

function linkClass(active: boolean, compact = false) {
  if (compact) {
    return `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 py-3.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
      active ? "text-white" : "text-white/50"
    }`;
  }
  return `px-3 py-3 border-b-2 transition-colors whitespace-nowrap text-sm ${
    active
      ? "border-[#D31411] text-white font-medium"
      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
  }`;
}

export function Nav({ email, isAdmin }: NavProps) {
  const pathname = usePathname();
  const allDesktopLinks = isAdmin
    ? [...PRIMARY_LINKS, { href: "/admin", label: "Admin", mobileLabel: "Admin" }]
    : [...PRIMARY_LINKS];

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{ borderColor: F1.carbonMid, background: `${F1.carbon}f2` }}
      >
        {/* Top bar: compact brand + sign out */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/dashboard" className="min-w-0 shrink">
            <AppBrand theme="dark" layout="nav" logoHeight={18} />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-xs font-medium ${
                  pathname.startsWith("/admin") ? "text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Admin
              </Link>
            )}
            <span className="hidden max-w-[140px] truncate text-xs text-slate-500 lg:inline">{email}</span>
            <SignOutButton />
          </div>
        </div>

        {/* Desktop tab row */}
        <nav className="mx-auto hidden max-w-5xl px-4 md:flex">
          {allDesktopLinks.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href as Route} className={linkClass(active)}>
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t md:hidden"
        style={{ borderColor: F1.carbonMid, background: F1.carbon }}
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg px-1 pt-1">
          {PRIMARY_LINKS.map(({ href, mobileLabel }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href as Route}
                className={linkClass(active, true)}
                style={active ? { boxShadow: `inset 0 2px 0 0 ${F1.red}` } : undefined}
              >
                {mobileLabel}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
