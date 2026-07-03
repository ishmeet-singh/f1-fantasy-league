import type { ReactNode } from "react";
import { F1 } from "@/lib/f1-theme";

/** Light Grid Chicane shell — only affects /admin. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative -mx-4 -mt-4 px-4 py-6 pb-12"
      style={{ background: F1.offWhite, color: F1.carbon }}
    >
      <div className="mx-auto w-full max-w-lg space-y-4 md:max-w-2xl lg:max-w-3xl">{children}</div>
    </div>
  );
}
