/** Grid Chicane palette for HTML emails (inline styles only — no CSS classes). */
export const EMAIL = {
  red: "#D31411",
  redDark: "#A6100E",
  redLight: "#FEF2F2",
  carbon: "#1C1C25",
  carbonMid: "#3A3A47",
  carbonLight: "#6B6B76",
  white: "#FFFFFF",
  offWhite: "#F8F8F8",
  gridLine: "#E5E5E5",
  urgentBg: "#FFFBEB",
  urgentBorder: "#FDE68A",
  urgentText: "#92400E"
} as const;

export type EmailLayoutOptions = {
  appUrl: string;
  preheader?: string;
  /** HTML inside the white card (paragraphs, headings, etc.) */
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
};

function logoUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}/f1-logo-white.png`;
}

/** Table-based email shell matching the app Grid Chicane look. */
export function renderEmailLayout({
  appUrl,
  preheader,
  bodyHtml,
  ctaLabel,
  ctaHref,
  footerNote = "F1 Fantasy League · You're receiving this because you're a registered player."
}: EmailLayoutOptions): string {
  const ctaBlock =
    ctaLabel && ctaHref
      ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                <tr>
                  <td style="border-radius:12px;background:${EMAIL.red};">
                    <a href="${ctaHref}"
                      style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:${EMAIL.white};text-decoration:none;border-radius:12px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>F1 Fantasy League</title>
  ${preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:${EMAIL.offWhite};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL.offWhite};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
          <tr>
            <td style="background:${EMAIL.carbon};border-radius:16px 16px 0 0;border-top:4px solid ${EMAIL.red};padding:20px 24px;">
              <img src="${logoUrl(appUrl)}" alt="F1" width="80" height="20" style="display:block;height:20px;width:auto;max-width:80px;border:0;" />
              <p style="margin:6px 0 0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL.white};line-height:1;">
                Fantasy League
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL.white};padding:24px;border-radius:0 0 16px 16px;border:1px solid ${EMAIL.gridLine};border-top:0;">
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.5;color:${EMAIL.carbonLight};">
              ${footerNote}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
