/**
 * Email sending utility.
 *
 * Currently logs reset links to the console.
 * To enable real email delivery, install a provider (e.g. Resend, SendGrid,
 * Nodemailer) and replace the stub body below.
 *
 * Example with Resend:
 *   import { Resend } from "resend";
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: "...", to, subject, html });
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  // TODO: Replace with a real email provider
  console.log(`\n--- PASSWORD RESET ---`);
  console.log(`To: ${to}`);
  console.log(`Reset link: ${resetUrl}`);
  console.log(`(expires in 1 hour)`);
  console.log(`----------------------\n`);
}
