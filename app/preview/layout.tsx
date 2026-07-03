import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Preview — F1 Fantasy League",
  robots: { index: false, follow: false }
};

/** Full-screen shell so previews never inherit the dark production chrome. */
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-[#F8F8F8] text-zinc-900 antialiased">
      {children}
    </div>
  );
}
