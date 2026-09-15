/**
 * BuildPilot signup confirmation email content.
 *
 * Confirmation emails are sent by Supabase Auth. Paste the HTML from
 * `supabase/templates/confirm-signup.html` into:
 *   Supabase Dashboard → Authentication → Email Templates → Confirm signup
 *
 * Supported Supabase variables used in the dashboard template:
 *   {{ .ConfirmationURL }}  — keep this as the confirmation link
 *   {{ .Email }}
 *   {{ .Data.full_name }}   — from signup user_metadata.full_name
 */
export function buildSignupEmailTemplate({
  firstName,
  confirmUrl,
  appName = "BuildPilot",
}: {
  firstName: string;
  confirmUrl: string;
  appName?: string;
}) {
  const safeName = firstName?.trim() || "there";

  const subject = `Confirm your ${appName} account`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Confirm your ${appName} account</title>
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
                    <h1 style="margin:20px 0 0;font-size:28px;line-height:1.25;color:#1f1a17;font-weight:700;">Welcome to ${appName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 16px;color:#433c39;font-size:16px;line-height:1.7;">
                      Hi ${safeName},
                    </p>
                    <p style="margin:0 0 16px;color:#433c39;font-size:16px;line-height:1.7;">
                      Thanks for signing up for ${appName}.
                    </p>
                    <p style="margin:0 0 24px;color:#433c39;font-size:16px;line-height:1.7;">
                      Please confirm your email address to activate your account and start managing your construction projects, BOQs, materials, quotations, tasks, and project progress in one place.
                    </p>

                    <div style="margin:28px 0;text-align:center;">
                      <a href="${confirmUrl}" style="display:inline-block;background:#ff7a45;color:#ffffff;text-decoration:none;border-radius:12px;padding:16px 28px;font-size:16px;font-weight:700;">
                        Confirm My Email
                      </a>
                    </div>

                    <p style="margin:0 0 12px;color:#5f5654;font-size:14px;line-height:1.6;">
                      If the button above does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;color:#7a4b2d;font-size:13px;line-height:1.6;word-break:break-all;">
                      ${confirmUrl}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px;">
                    <p style="margin:0 0 16px;color:#5f5654;font-size:14px;line-height:1.7;">
                      If you didn&apos;t create a ${appName} account, you can safely ignore this email.
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

  const text = `Welcome to ${appName}

Hi ${safeName},

Thanks for signing up for ${appName}.

Please confirm your email address to activate your account and start managing your construction projects, BOQs, materials, quotations, tasks, and project progress in one place.

Confirm your email:
${confirmUrl}

If you didn't create a ${appName} account, you can safely ignore this email.

Thanks,
The ${appName} Team

${appName}
Construction Project Management, Simplified.`;

  return { subject, html, text };
}
