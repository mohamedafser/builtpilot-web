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
      <body style="margin:0;padding:0;background:#f5f1ee;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f1ee;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #efe6df;">
                <tr>
                  <td style="padding:28px 32px 18px;background:linear-gradient(135deg,#fff8f3,#fff1e6);border-bottom:1px solid #f0e4dc;">
                    <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#c06735;font-weight:700;">${appName}</div>
                    <h1 style="margin:12px 0 0;font-size:32px;line-height:1.2;color:#1f1a17;font-weight:700;">Welcome, ${safeName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;color:#433c39;font-size:16px;line-height:1.7;">
                      Thanks for joining ${appName}. To finish creating your account and start managing projects, confirm your email address.
                    </p>

                    <div style="margin:26px 0; text-align:center;">
                      <a href="${confirmUrl}" style="display:inline-block;background:#ff7a45;color:#ffffff;text-decoration:none;border-radius:12px;padding:16px 28px;font-size:16px;font-weight:700;">
                        Confirm my account
                      </a>
                    </div>

                    <p style="margin:0 0 12px;color:#5f5654;font-size:14px;line-height:1.6;">
                      If the button above does not work, copy and paste this link into your browser:
                    </p>
                    <p style="margin:0;color:#7a4b2d;font-size:14px;line-height:1.6;word-break:break-all;">
                      ${confirmUrl}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f9f5f3;border-radius:14px;border:1px solid #f1e5dd;">
                      <tr>
                        <td style="padding:18px 20px;color:#4d4745;font-size:14px;line-height:1.7;">
                          BuildPilot helps construction teams track projects, labour, materials, quotations, BOQ, and client updates in one place.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 28px;color:#7a706d;font-size:12px;line-height:1.6;text-align:center;">
                    You received this email because you created a ${appName} account. If this was not you, you can safely ignore it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `Welcome to ${appName}.

Thanks for joining ${appName}. To finish creating your account, confirm your email address:

${confirmUrl}

If you did not create this account, you can ignore this email.`;

  return { subject, html, text };
}
