type F1LogoProps = {
  className?: string;
  /** Height in px; width scales from official 187.56:53.03 aspect ratio */
  height?: number;
  /** F letter colour on light backgrounds */
  theme?: "light" | "dark";
};

/** Official-style F1 wordmark (F + red speed marks). */
export function F1Logo({ className, height = 22, theme = "light" }: F1LogoProps) {
  const fColor = theme === "dark" ? "#FFFFFF" : "#15151E";
  const width = (height * 187.56) / 53.03;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 187.56 53.03"
      className={className}
      aria-label="F1"
      role="img"
    >
      <path
        fill="#E10600"
        d="M44.42 0h29.87L33.19 53.03H3.32L0 44.76h23.87L44.42 0zm55.15 14.96H25.34L9.27 38.07h74.23l16.07-23.11zM187.56 0v53.03h-32.18L187.56 0z"
      />
      <path fill={fColor} d="M52.31 0H22.43L0 44.76V53.03h29.88L52.31 0z" />
    </svg>
  );
}

type AppBrandProps = {
  className?: string;
  logoHeight?: number;
  theme?: "light" | "dark";
  /** "stacked" puts Fantasy League under the logo */
  layout?: "inline" | "stacked";
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
