import nodemailer from "nodemailer";
import { EMAIL, renderEmailLayout } from "@/lib/email-brand";

type EventType = "quali" | "sprint" | "race";

const EVENT_LABELS: Record<EventType, string> = {
  quali: "Qualifying",
  sprint: "Sprint",
  race: "Race"
};

function formatTimeLabel(minutesLeft: number): string {
  if (minutesLeft >= 60) return `${Math.round(minutesLeft / 60)} hour${Math.round(minutesLeft / 60) === 1 ? "" : "s"}`;
  return `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}`;
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD env var is missing");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass }
  });
}

export async function sendReminderEmail({
  to,
  name,
  raceName,
  eventType,
  minutesLeft,
  picksLink,
  isMagicLink = false,
  appUrl
}: {
  to: string;
  name: string;
  raceName: string;
  eventType: EventType;
  minutesLeft: number;
  picksLink: string;
  isMagicLink?: boolean;
  appUrl?: string;
}) {
  const eventLabel = EVENT_LABELS[eventType];
  const timeLabel = formatTimeLabel(minutesLeft);
  const isUrgent = minutesLeft <= 60;
  const fromAddress = process.env.GMAIL_USER!;
  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  const subject = isUrgent
    ? `Last chance — ${raceName} ${eventLabel} picks lock in ${timeLabel}`
    : `${raceName} ${eventLabel} predictions — ${timeLabel} to go`;

  const linkNote = isMagicLink
    ? "This link signs you in automatically — no password needed. It expires after one use."
    : "You'll be asked to sign in if you're not already logged in.";

  const urgentBanner = isUrgent
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
        <tr>
          <td style="padding:12px 14px;border-radius:12px;background:${EMAIL.urgentBg};border:1px solid ${EMAIL.urgentBorder};font-size:13px;font-weight:600;color:${EMAIL.urgentText};">
            Picks lock in ${timeLabel} — submit before the session starts.
          </td>
        </tr>
      </table>`
    : "";

  const bodyHtml = `
    ${urgentBanner}
    <p style="margin:0 0 8px;font-size:14px;color:${EMAIL.carbonLight};">Hey ${name || "there"},</p>
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;line-height:1.35;color:${EMAIL.carbon};">
      ${raceName} ${eventLabel}
    </h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:${EMAIL.carbon};">
      Your ${eventLabel.toLowerCase()} predictions aren't in yet. You have
      <strong style="color:${EMAIL.red};">${timeLabel}</strong> before picks lock.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.5;color:${EMAIL.carbonLight};">
      Tap the button below to open the app and lock in your picks before the deadline.
    </p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${EMAIL.carbonLight};">
      ${linkNote}
    </p>
    ${
      isMagicLink
        ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${EMAIL.carbonLight};">
            Link not working?
            <a href="${baseUrl}/picks" style="color:${EMAIL.red};text-decoration:underline;">Go to the app directly</a>
          </p>`
        : ""
    }`;

  const html = renderEmailLayout({
    appUrl: baseUrl,
    preheader: `${raceName} ${eventLabel} picks lock in ${timeLabel}`,
    bodyHtml,
    ctaLabel: `Submit my ${eventLabel} picks →`,
    ctaHref: picksLink
  });

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `F1 Fantasy League <${fromAddress}>`,
    to,
    subject,
    html
  });

  if (!info.messageId) {
    throw new Error("Email send returned no messageId");
  }
}
