import Image from "next/image";

/** Official F1 wordmark aspect ratio (800×200 source). */
const LOGO_ASPECT = 4;

type F1LogoProps = {
  className?: string;
  /** Height in px; width scales from asset aspect ratio */
  height?: number;
  /** dark = white logo on Shark/dark surfaces; light = Thunderbird red on white */
  theme?: "light" | "dark";
};

/** Official F1 wordmark (user-provided transparent PNGs). */
export function F1Logo({ className, height = 22, theme = "light" }: F1LogoProps) {
  const width = Math.round(height * LOGO_ASPECT);
  const src = theme === "dark" ? "/f1-logo-white.png" : "/f1-logo-red.png";

  return (
    <Image
      src={src}
      alt="F1"
      width={width}
      height={height}
      className={`shrink-0 object-contain object-left${className ? ` ${className}` : ""}`}
    />
  );
}

type AppBrandProps = {
  className?: string;
  logoHeight?: number;
  theme?: "light" | "dark";
  /** "stacked" centres logo + title; "nav" is compact left-aligned for the header */
  layout?: "inline" | "stacked" | "nav";
  subtitle?: string;
};

export function AppBrand({
  className,
  logoHeight = 22,
  theme = "light",
  layout = "inline",
  subtitle
}: AppBrandProps) {
  const textColor = theme === "dark" ? "text-white" : "text-zinc-900";
  const subColor = theme === "dark" ? "text-zinc-400" : "text-zinc-500";

  if (layout === "nav") {
    return (
      <div className={`flex flex-col items-start gap-0.5${className ? ` ${className}` : ""}`}>
        <F1Logo height={logoHeight} theme={theme} />
        <p className={`text-[10px] font-bold uppercase leading-none tracking-wide ${textColor}`}>
          Fantasy League
        </p>
      </div>
    );
  }

  if (layout === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-2${className ? ` ${className}` : ""}`}>
        <F1Logo height={logoHeight} theme={theme} />
        <div className="text-center">
          <p className={`text-lg font-bold tracking-tight ${textColor}`}>Fantasy League</p>
          {subtitle && <p className={`text-sm ${subColor}`}>{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 min-w-0${className ? ` ${className}` : ""}`}>
      <F1Logo height={logoHeight} theme={theme} className="shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className={`font-bold tracking-tight truncate ${textColor}`}>
          Fantasy <span className="font-semibold opacity-80">League</span>
        </p>
        {subtitle && <p className={`text-xs truncate ${subColor}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
