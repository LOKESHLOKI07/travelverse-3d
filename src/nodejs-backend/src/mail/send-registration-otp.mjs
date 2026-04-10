import nodemailer from "nodemailer";

/**
 * @param {string} toEmail
 * @param {string} otpDigits
 * @param {"admin" | "user"} [purpose]
 * @returns {Promise<{ devMode: boolean }>}
 */
export async function sendRegistrationOtpEmail(toEmail, otpDigits, purpose = "admin") {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  const from =
    process.env.SMTP_FROM?.trim() || user || "noreply@tourist-node-api.local";

  if (!host) {
    const label = purpose === "user" ? "user registration" : "admin registration";
    console.warn(
      `[tourist-node-api] SMTP_HOST not set — dev OTP (${label}) for ${toEmail}: ${otpDigits}`,
    );
    return { devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  const subject =
    purpose === "user"
      ? "Your account verification code"
      : "Your admin registration verification code";
  const text = `Your verification code is: ${otpDigits}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otpDigits}</p><p style="color:#666">It expires in 10 minutes. If you did not request this, ignore this email.</p>`;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { devMode: false };
}
