import { QUOTATION_ITEM_TYPE_LABELS } from "@/constants/quotation";
import { sendEmail } from "@/lib/email/send";
import { formatLabourCost, parseIsoDate } from "@/lib/labour/money";
import type { QuotationItemType } from "@/types";

export type QuotationEmailInput = {
  quotation_number: string;
  title: string;
  client_name: string;
  client_email: string | null;
  quotation_date: string;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  business_name: string;
  items: Array<{
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    total_amount: string;
    item_type: QuotationItemType;
  }>;
  acceptUrl?: string | null;
  rejectUrl?: string | null;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function multilineHtml(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

export function buildQuotationEmail(quotation: QuotationEmailInput): {
  to: string;
  subject: string;
  html: string;
  text: string;
} {
  const to = quotation.client_email?.trim() ?? "";
  const subject = `Quotation ${quotation.quotation_number} from ${quotation.business_name}`;
  const itemRowsHtml = quotation.items
    .map(
      (item) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e7e5e4;color:#1c1917;">
          <div style="font-weight:600;">${escapeHtml(item.description)}</div>
          <div style="font-size:12px;color:#78716c;margin-top:4px;">${escapeHtml(QUOTATION_ITEM_TYPE_LABELS[item.item_type])}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7e5e4;color:#44403c;">${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7e5e4;color:#44403c;">${escapeHtml(formatLabourCost(item.unit_price))}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7e5e4;color:#1c1917;text-align:right;font-weight:600;">${escapeHtml(formatLabourCost(item.total_amount))}</td>
      </tr>`,
    )
    .join("");
  const itemRowsText = quotation.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.description} (${QUOTATION_ITEM_TYPE_LABELS[item.item_type]}) — ${item.quantity} ${item.unit} × ${formatLabourCost(item.unit_price)} = ${formatLabourCost(item.total_amount)}`,
    )
    .join("\n");
  const notesHtml = quotation.notes
    ? `<p style="margin:24px 0 8px;font-size:13px;font-weight:600;color:#1c1917;">Notes</p><p style="margin:0;color:#57534e;font-size:14px;line-height:1.5;">${multilineHtml(quotation.notes)}</p>`
    : "";
  const termsHtml = quotation.terms
    ? `<p style="margin:24px 0 8px;font-size:13px;font-weight:600;color:#1c1917;">Terms</p><p style="margin:0;color:#57534e;font-size:14px;line-height:1.5;">${multilineHtml(quotation.terms)}</p>`
    : "";
  const notesText = quotation.notes ? `\nNotes:\n${quotation.notes}\n` : "";
  const termsText = quotation.terms ? `\nTerms:\n${quotation.terms}\n` : "";

  const acceptUrl = quotation.acceptUrl?.trim() || "";
  const rejectUrl = quotation.rejectUrl?.trim() || "";
  const hasActions = Boolean(acceptUrl && rejectUrl);

  const actionsHtml = hasActions
    ? `<tr>
        <td style="padding:8px 28px 24px;">
          <p style="margin:0 0 12px;color:#44403c;font-size:14px;">Please review and respond:</p>
          <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;margin-right:10px;padding:12px 18px;background:#15803d;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Accept quotation</a>
          <a href="${escapeHtml(rejectUrl)}" style="display:inline-block;padding:12px 18px;background:#ffffff;color:#b91c1c;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #fecaca;">Reject quotation</a>
        </td>
      </tr>`
    : "";

  const actionsText = hasActions
    ? `\nPlease review and respond:\nAccept: ${acceptUrl}\nReject: ${rejectUrl}\n`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a29e;">${escapeHtml(quotation.business_name)}</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#1c1917;">Quotation ${escapeHtml(quotation.quotation_number)}</h1>
          <p style="margin:8px 0 0;color:#57534e;font-size:14px;">${escapeHtml(quotation.title)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 8px;color:#44403c;font-size:14px;line-height:1.5;">
          <p style="margin:0;">Hello ${escapeHtml(quotation.client_name)},</p>
          <p style="margin:12px 0 0;">Please find the quotation details below.</p>
          <p style="margin:12px 0 0;">
            Date: ${escapeHtml(formatEmailDate(quotation.quotation_date))}<br />
            Valid until: ${escapeHtml(formatEmailDate(quotation.valid_until))}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th align="left" style="padding:8px;border-bottom:1px solid #d6d3d1;color:#78716c;font-weight:600;">Description</th>
                <th align="left" style="padding:8px;border-bottom:1px solid #d6d3d1;color:#78716c;font-weight:600;">Qty</th>
                <th align="left" style="padding:8px;border-bottom:1px solid #d6d3d1;color:#78716c;font-weight:600;">Rate</th>
                <th align="right" style="padding:8px;border-bottom:1px solid #d6d3d1;color:#78716c;font-weight:600;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml}</tbody>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
            <tr>
              <td style="padding:4px 0;color:#78716c;">Subtotal</td>
              <td style="padding:4px 0;text-align:right;color:#1c1917;">${escapeHtml(formatLabourCost(quotation.subtotal))}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#78716c;">Discount</td>
              <td style="padding:4px 0;text-align:right;color:#1c1917;">${escapeHtml(formatLabourCost(quotation.discount_amount))}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#78716c;">Tax</td>
              <td style="padding:4px 0;text-align:right;color:#1c1917;">${escapeHtml(formatLabourCost(quotation.tax_amount))}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;font-weight:700;color:#1c1917;">Total</td>
              <td style="padding:10px 0 0;text-align:right;font-weight:700;font-size:16px;color:#1c1917;">${escapeHtml(formatLabourCost(quotation.total_amount))}</td>
            </tr>
          </table>
          ${notesHtml}
          ${termsHtml}
        </td>
      </tr>
      ${actionsHtml}
      <tr>
        <td style="padding:8px 28px 28px;color:#78716c;font-size:13px;">
          Reply to this email if you have any questions.
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${quotation.business_name}
Quotation ${quotation.quotation_number}
${quotation.title}

Hello ${quotation.client_name},

Please find the quotation details below.

Date: ${formatEmailDate(quotation.quotation_date)}
Valid until: ${formatEmailDate(quotation.valid_until)}

${itemRowsText}

Subtotal: ${formatLabourCost(quotation.subtotal)}
Discount: ${formatLabourCost(quotation.discount_amount)}
Tax: ${formatLabourCost(quotation.tax_amount)}
Total: ${formatLabourCost(quotation.total_amount)}
${notesText}${termsText}${actionsText}
Reply to this email if you have any questions.
`;

  return { to, subject, html, text };
}

export async function sendQuotationEmail(
  quotation: QuotationEmailInput,
  replyTo?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = quotation.client_email?.trim() ?? "";

  if (!to) {
    return {
      ok: false,
      error: "Add a client email before sending this quotation.",
    };
  }

  const content = buildQuotationEmail({ ...quotation, client_email: to });
  return sendEmail({
    ...content,
    replyTo: replyTo?.trim() || null,
  });
}
