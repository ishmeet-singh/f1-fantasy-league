import nodemailer from "nodemailer";

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
  magicLink
}: {
  to: string;
  name: string;
  raceName: string;
  eventType: EventType;
  minutesLeft: number;
  magicLink: string;
}) {
  const eventLabel = EVENT_LABELS[eventType];
  const timeLabel = formatTimeLabel(minutesLeft);
  const isUrgent = minutesLeft <= 60;
  const fromAddress = process.env.GMAIL_USER!;

  const subject = isUrgent
    ? `⏰ Last chance! ${raceName} ${eventLabel} picks lock in ${timeLabel}`
    : `🏎️ ${raceName} ${eventLabel} predictions — ${timeLabel} to go`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="background:#020617;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:32px;">🏎️</span>
      <h1 style="color:#f8fafc;font-size:20px;font-weight:700;margin:12px 0 4px;">F1 Friends League</h1>
    </div>

    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 8px;">Hey ${name || "there"},</p>
      <h2 style="color:#f8fafc;font-size:18px;font-weight:600;margin:0 0 16px;line-height:1.4;">
        ${raceName} ${eventLabel} picks lock in <span style="color:#ef4444;">${timeLabel}</span>
      </h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
        You haven't submitted your ${eventLabel.toLowerCase()} predictions yet. Click below to sign in and lock in your picks before the deadline.
      </p>
      <a href="${magicLink}"
        style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
        Submit my ${eventLabel} picks →
      </a>
      <p style="color:#475569;font-size:12px;margin:20px 0 0;">
        This link signs you in automatically — no password needed.<br/>
        It expires after one use.
      </p>
    </div>

    <p style="color:#334155;font-size:12px;text-align:center;margin-top:24px;">
      F1 Friends League · You're receiving this because you're a registered player.
    </p>
  </div>
</body>
</html>
  `.trim();

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: `F1 Friends League <${fromAddress}>`,
    to,
    subject,
    html
  });

  if (!info.messageId) {
    throw new Error("Email send returned no messageId");
  }
}
