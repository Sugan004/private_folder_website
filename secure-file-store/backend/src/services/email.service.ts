import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string, username: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Your SecureVault Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #0a0b0f; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 480px; margin: 40px auto; background: #1a1d27; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
            .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
            .logo-icon { background: linear-gradient(135deg, #6c63ff, #a78bfa); border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 40px; text-align: center; }
            .title { font-size: 22px; font-weight: 700; color: #f1f2f5; margin: 0 0 8px 0; }
            .subtitle { font-size: 14px; color: #8b8fa8; margin: 0 0 28px 0; }
            .otp-box { background: #0a0b0f; border: 2px solid #6c63ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
            .otp-label { font-size: 12px; color: #555870; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .otp-code { font-size: 40px; font-weight: 800; color: #6c63ff; letter-spacing: 10px; font-family: monospace; }
            .note { font-size: 13px; color: #555870; margin-top: 24px; line-height: 1.6; }
            .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 12px; color: #555870; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <div class="logo-icon">🛡️</div>
              <span style="font-size: 18px; font-weight: 700; color: #f1f2f5;">SecureVault</span>
            </div>
            <h2 class="title">Verify your email</h2>
            <p class="subtitle">Hi <strong>${username}</strong>, enter this code to activate your account.</p>
            <div class="otp-box">
              <div class="otp-label">Your verification code</div>
              <div class="otp-code">${otp}</div>
            </div>
            <p class="note">
              This code expires in <strong>10 minutes</strong>.<br />
              If you didn't create a SecureVault account, you can safely ignore this email.
            </p>
            <div class="footer">© ${new Date().getFullYear()} SecureVault · Secure File Storage</div>
          </div>
        </body>
      </html>
    `,
  });
}
