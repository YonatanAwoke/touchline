import { NextResponse } from "next/server";
import prisma from "@touchline/database";
import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "apps/backend/data/early-access.json");

function isValidEmail(email: string) {
  const re = /^(?:[a-zA-Z0-9_'’+\-]+(?:\.[a-zA-Z0-9_'’+\-]+)*)@(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

async function saveEmail(email: string) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    let list: string[] = [];
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      list = JSON.parse(raw || "[]");
    } catch (e) {
      list = [];
    }
    if (!list.includes(email)) {
      list.push(email);
      await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Failed to save early access email:", err);
  }
}

async function sendEarlyAccessEmail(email: string) {
  // Only attempt if SMTP configured
  const host = process.env.SMTP_HOST;
  if (!host) return { sent: false, reason: "SMTP not configured" };

  // Dynamic import so the route doesn't fail at build time if nodemailer
  // is not installed. This also makes the code more resilient in CI/dev.
  let nodemailer: any;
  try {
    const mod = await import("nodemailer");
    nodemailer = mod?.default ?? mod;
  } catch (err) {
    console.warn("nodemailer not installed; skipping send:", err);
    return { sent: false, reason: "nodemailer not installed" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });

  const from = process.env.FROM_EMAIL || `Touchline <no-reply@touchline.app>`;
  const subject = "You're registered for Touchline Early Access";
  const templatePath = path.join(process.cwd(), "apps/backend/src/lib/emailTemplates/earlyAccess.html");
  let html = "";
  try {
    html = await fs.readFile(templatePath, "utf8");
    html = html.replace(/{{email}}/g, email);
  } catch (err) {
    html = `<p>Thanks for signing up for Touchline early access — we'll notify you when it's released.</p>`;
  }

  // Prepare a simple plain-text fallback
  const text = `Hi ${email},\n\nThanks for signing up for Touchline early access. We'll notify you when it's released.\n\n— Touchline`;

  try {
    // Verify transporter if possible (this can help surface auth issues)
    try {
      await transporter.verify();
    } catch (vErr) {
      console.warn("SMTP verify failed:", vErr);
    }

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
      text,
      headers: {
        "X-Touchline-Source": "early-access",
      },
    });

    // Log important response fields that help diagnose delivery issues
    console.info("Email send info:", {
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });

    return { sent: true, info: { messageId: info?.messageId, accepted: info?.accepted } };
  } catch (err) {
    console.error("Failed to send early access email:", err);
    return { sent: false, reason: String(err) };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").toString().trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check if email belongs to an existing user
    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // existing user — we still record/notify
        await saveEmail(email);
        const result = await sendEarlyAccessEmail(email);
        return NextResponse.json({ message: "Existing account found — notification sent.", sent: result.sent });
      }
    } catch (err) {
      console.error("Prisma check failed:", err);
      // continue — still try to register
    }

    // Not an existing user — save to list and send email
    await saveEmail(email);
    const result = await sendEarlyAccessEmail(email);
    const message = result.sent
      ? "You're registered for early access — we'll notify you when it launches."
      : "You're registered for early access. (Email not sent: SMTP not configured)";

    return NextResponse.json({ message, sent: result.sent });
  } catch (err) {
    console.error("Early access registration error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
