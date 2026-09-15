import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuotationEmail,
  escapeHtml,
  type QuotationEmailInput,
} from "./email";

const quotation: QuotationEmailInput = {
  quotation_number: "BP-2026-0001",
  title: "Site compound wall",
  client_name: "Asha <Patel>",
  client_email: "asha@example.com",
  quotation_date: "2026-09-13",
  valid_until: "2026-10-13",
  notes: "Includes cement & steel.",
  terms: "50% advance",
  subtotal: "25000.00",
  discount_amount: "0.00",
  tax_amount: "0.00",
  total_amount: "25000.00",
  business_name: "Rao Builders",
  items: [
    {
      description: "Mason work",
      quantity: "10",
      unit: "day",
      unit_price: "1500.00",
      total_amount: "15000.00",
      item_type: "labour",
    },
    {
      description: "Cement",
      quantity: "20",
      unit: "bag",
      unit_price: "500.00",
      total_amount: "10000.00",
      item_type: "material",
    },
  ],
};

describe("quotation email", () => {
  it("escapes HTML in user-provided text", () => {
    assert.equal(escapeHtml("Asha <Patel>"), "Asha &lt;Patel&gt;");
  });

  it("builds a client email with number, items, and total", () => {
    const email = buildQuotationEmail(quotation);

    assert.equal(email.to, "asha@example.com");
    assert.equal(email.subject, "Quotation BP-2026-0001 from Rao Builders");
    assert.match(email.html, /Quotation BP-2026-0001/);
    assert.match(email.html, /Asha &lt;Patel&gt;/);
    assert.match(email.html, /Mason work/);
    assert.match(email.html, /Cement/);
    assert.match(email.text, /Total:.*25,000/);
    assert.doesNotMatch(email.html, /Asha <Patel>/);
  });

  it("includes accept and reject action links when provided", () => {
    const email = buildQuotationEmail({
      ...quotation,
      acceptUrl: "https://app.example.com/client/quotation/token?action=accept",
      rejectUrl: "https://app.example.com/client/quotation/token?action=reject",
    });

    assert.match(email.html, /Accept quotation/);
    assert.match(email.html, /Reject quotation/);
    assert.match(
      email.html,
      /https:\/\/app\.example\.com\/client\/quotation\/token\?action=accept/,
    );
    assert.match(email.text, /Accept: https:\/\/app\.example\.com/);
  });
});
