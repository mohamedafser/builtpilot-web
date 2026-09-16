/**
 * BuildPilot password-reset verification email (OTP) sent via app SMTP.
 */
export function buildPasswordResetEmailTemplate({
  firstName,
  otp,
  appName = "BuildPilot",
}: {
  firstName: string;
  otp: string;
  appName?: string;
}) {
  const safeName = firstName?.trim() || "there";
  const subject = `Your ${appName} password reset code`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f1ee;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f1ee;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #efe6df;">
                <tr>
                  <td style="padding:28px 28px 20px;background:linear-gradient(135deg,#fff8f3,#fff1e6);border-bottom:1px solid #f0e4dc;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:40px;height:40px;border-radius:10px;background:#ff7a45;color:#ffffff;font-size:14px;font-weight:700;text-align:center;vertical-align:middle;">BP</td>
                        <td style="padding-left:12px;font-size:18px;font-weight:700;color:#1f1a17;">${appName}</td>
                      </tr>
                    </table>
                    <h1 style="margin:20px 0 0;font-size:28px;line-height:1.25;color:#1f1a17;font-weight:700;">Reset your password</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 16px;color:#433c39;font-size:16px;line-height:1.7;">
                      Hi ${safeName},
                    </p>
                    <p style="margin:0 0 24px;color:#433c39;font-size:16px;line-height:1.7;">
                      Use the verification code below to reset your ${appName} password:
                    </p>
                    <div style="margin:8px 0 24px;text-align:center;">
                      <div style="display:inline-block;background:#fff8f3;border:1px solid #f0e4dc;border-radius:16px;padding:18px 28px;font-size:36px;letter-spacing:10px;font-weight:700;color:#1f1a17;">
                        ${otp}
                      </div>
                    </div>
                    <p style="margin:0 0 16px;color:#5f5654;font-size:14px;line-height:1.7;text-align:center;">
                      This code will expire in 5 minutes.
                    </p>
                    <p style="margin:0;color:#433c39;font-size:15px;line-height:1.7;">
                      Enter this code in the ${appName} app to continue.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px;">
                    <p style="margin:0 0 16px;color:#5f5654;font-size:14px;line-height:1.7;">
                      If you didn&apos;t request a password reset, you can safely ignore this email.
                    </p>
                    <p style="margin:0;color:#433c39;font-size:15px;line-height:1.7;">
                      Thanks,<br />
                      The ${appName} Team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 28px;border-top:1px solid #f0e4dc;text-align:center;">
                    <p style="margin:0;color:#1f1a17;font-size:14px;font-weight:700;">${appName}</p>
                    <p style="margin:6px 0 0;color:#7a706d;font-size:12px;line-height:1.6;">
                      Construction Project Management, Simplified.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Reset your password

Hi ${safeName},

Use this ${appName} verification code to reset your password:

${otp}

This code will expire in 5 minutes.

If you didn't request a password reset, you can safely ignore this email.

Thanks,
The ${appName} Team`;

  return { subject, html, text };
}
