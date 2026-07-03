import Link from "next/link";

const DIRECTIONS = [
  {
    href: "/preview/design-a",
    tag: "A",
    title: "Timing Tower",
    desc: "Broadcast graphics — bold type, timing-screen hierarchy, high contrast stripes."
  },
  {
    href: "/preview/design-b",
    tag: "B",
    title: "Pit Wall",
    desc: "Engineering minimal — quiet whitespace, hairline rules, data-first tables."
  },
  {
    href: "/preview/design-c",
    tag: "C",
    title: "Grid Chicane",
    desc: "Modern livery — soft gradients, pill badges, friendly mobile cards."
  }
];

export default function PreviewIndexPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Internal only</p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">UI design previews</h1>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
        Not linked from the live app. Sample data mirrors an 8-race season with best-4-of-8 drops.
      </p>
      <ul className="mt-8 space-y-3">
        {DIRECTIONS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                  {d.tag}
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">{d.title}</p>
                  <p className="text-sm text-zinc-500">{d.desc}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
