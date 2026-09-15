import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

type SendEmailResult = { ok: true } | { ok: false; error: string };

const DEFAULT_FROM = "BuildPilot <beth.t@example.com>";

function getEmailFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    DEFAULT_FROM
  );
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    secure: port === 465,
  };
}

function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

function smtpErrorMessage(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const lowered = message.toLowerCase();

  if (
    lowered.includes("invalid login") ||
    lowered.includes("username and password not accepted") ||
    lowered.includes("badcredentials")
  ) {
    return "Gmail rejected the login. Use a Gmail App Password in SMTP_PASS, not your normal Gmail password. Create one at https://myaccount.google.com/apppasswords";
  }

  return message.trim() || "Unable to email this quotation. Please try again.";
}

async function sendWithSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const smtp = getSmtpConfig();

  if (!smtp) {
    return {
      ok: false,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: getEmailFromAddress(),
      to: input.to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: smtpErrorMessage(error) };
  }
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return {
      ok: false,
      error:
        "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local to send quotations from Gmail.",
    };
  }

  const payload: Record<string, unknown> = {
    from: getEmailFromAddress(),
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  if (input.replyTo) {
    payload.reply_to = input.replyTo;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { ok: true };
    }

    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message = body?.message?.trim() ?? "";

    if (message.toLowerCase().includes("domain is not verified")) {
      return {
        ok: false,
        error:
          "Resend cannot send from that From address. Use Gmail SMTP instead: set SMTP_HOST=smtp.gmail.com, SMTP_USER, SMTP_PASS (a Gmail App Password), and EMAIL_FROM to your Gmail address.",
      };
    }

    return {
      ok: false,
      error: message || "Unable to email this quotation. Please try again.",
    };
  } catch {
    return {
      ok: false,
      error: "Unable to email this quotation. Please try again.",
    };
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (getSmtpConfig()) {
    return sendWithSmtp(input);
  }

  if (getResendApiKey()) {
    return sendWithResend(input);
  }

  return {
    ok: false,
    error:
      "Quotation email is not configured. Signup emails are sent by Supabase automatically. Quotation emails need Gmail SMTP in .env.local: SMTP_HOST, SMTP_USER, and SMTP_PASS.",
  };
}
