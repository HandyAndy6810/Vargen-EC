/**
 * Email sending utility.
 *
 * Uses Resend when RESEND_API_KEY is set.
 * Falls back to console logging in development.
 *
 * To enable:
 *   1. npm install resend  (in the server workspace)
 *   2. Set RESEND_API_KEY in your environment
 *   3. Set EMAIL_FROM to your verified sender address (e.g. "noreply@yourdomain.com")
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@vargen.app";

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = "Reset your Vargen password";
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#555;margin:0 0 24px">
        Click the button below to reset your password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                padding:12px 24px;border-radius:8px;font-weight:600">
        Reset Password
      </a>
      <p style="color:#999;font-size:12px;margin:24px 0 0">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  if (RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
    console.log(`Password reset email sent to ${to}`);
  } else {
    // Development fallback — log to console
    console.log(`\n--- PASSWORD RESET (no email provider configured) ---`);
    console.log(`To: ${to}`);
    console.log(`Reset link: ${resetUrl}`);
    console.log(`(expires in 1 hour)`);
    console.log(`Set RESEND_API_KEY to send real emails.`);
    console.log(`-----------------------------------------------------\n`);
  }
}
