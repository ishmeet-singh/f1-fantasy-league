import { LoginForm } from "@/components/login-form";
import { HashAuthHandler } from "@/components/hash-auth-handler";
import { AppBrand } from "@/components/f1-logo";
import { F1 } from "@/lib/f1-theme";

export default async function Home({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const linkExpired = searchParams.error === "link_expired";

  return (
    <div
      className="relative -mx-4 -mt-4 flex min-h-[calc(100dvh-5rem)] flex-col md:min-h-[calc(100dvh-2rem)]"
      style={{ background: F1.offWhite, color: F1.carbon }}
    >
      <HashAuthHandler />

      {/* Carbon header with F1 logo */}
      <header
        className="relative shrink-0 border-b px-4 py-3"
        style={{ background: F1.carbon, borderColor: F1.carbonMid, boxShadow: F1.headerShadow }}
      >
        <div className="absolute left-0 top-0 h-0.5 w-full" style={{ background: F1.red }} />
        <div className="mx-auto flex max-w-lg items-center md:max-w-2xl">
          <AppBrand theme="dark" layout="nav" logoHeight={20} />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: F1.carbon }}>
              Sign in
            </h1>
            <p className="mt-1 text-sm" style={{ color: F1.carbonLight }}>
              The private F1 fantasy prediction league
            </p>
          </div>

          {linkExpired && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}
            >
              That sign-in link has expired or already been used. Enter your email below to get a fresh one.
            </div>
          )}

          <section className="rounded-2xl bg-white p-5" style={{ boxShadow: F1.cardShadow }}>
            <LoginForm />
          </section>
        </div>
      </div>
    </div>
  );
}
