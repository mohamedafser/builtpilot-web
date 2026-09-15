import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildClientUpdateMessage,
  buildPortalInviteMessage,
} from "@/lib/whatsapp/messages";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/validation";
import { sanitizeOutboundClientMessage } from "@/lib/communication/client-update";
import { evaluateWhatsAppEligibility } from "@/lib/whatsapp/send";

describe("WhatsApp phone validation", () => {
  it("normalizes Indian 10-digit mobiles", () => {
    const result = normalizeWhatsAppPhone("9876543210");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.e164, "+919876543210");
    }
  });

  it("rejects invalid numbers", () => {
    const result = normalizeWhatsAppPhone("123");
    assert.equal(result.ok, false);
  });
});

describe("client message builders", () => {
  it("builds portal invite without inventing data", () => {
    const message = buildPortalInviteMessage({
      clientName: "John",
      projectName: "Villa Construction",
      portalUrl: "https://app.example.com/client/project/abcTOKEN",
    });
    assert.match(message, /Hi John/);
    assert.match(message, /Villa Construction/);
    assert.match(message, /\/client\/project\/abcTOKEN/);
  });

  it("rejects non-portal links in invite builder", () => {
    const message = buildPortalInviteMessage({
      clientName: "John",
      projectName: "Villa",
      portalUrl: "https://evil.example.com/steal",
    });
    assert.doesNotMatch(message, /evil\.example/);
  });

  it("builds client update from draft fields only", () => {
    const message = buildClientUpdateMessage({
      clientName: "John",
      projectName: "Villa Construction",
      update: {
        this_week: ["Brickwork completed"],
        current_progress: "68%",
        upcoming: ["First-floor brickwork"],
        issues: ["Cement delivery was delayed by one day."],
      },
      portalUrl: "https://app.example.com/client/project/token123",
    });
    assert.match(message, /68%/);
    assert.match(message, /Brickwork completed/);
    assert.doesNotMatch(message, /wage/i);
  });
});

describe("outbound sanitization", () => {
  it("strips html and uuids", () => {
    const cleaned = sanitizeOutboundClientMessage(
      "<b>Hi</b> 550e8400-e29b-41d4-a716-446655440000",
    );
    assert.equal(cleaned.includes("<b>"), false);
    assert.equal(cleaned.includes("550e8400"), false);
  });
});

describe("WhatsApp eligibility", () => {
  it("blocks when consent missing", () => {
    const result = evaluateWhatsAppEligibility({
      access: {
        whatsapp_enabled: false,
        whatsapp_phone: "+919876543210",
        client_phone: "+919876543210",
        whatsapp_opted_in: false,
        is_active: true,
        expires_at: null,
      },
    });
    assert.equal(result.canSend, false);
    assert.match(result.reason ?? "", /not enabled/i);
  });

  it("blocks portal share when portal inactive", () => {
    const result = evaluateWhatsAppEligibility({
      access: {
        whatsapp_enabled: true,
        whatsapp_phone: "+919876543210",
        client_phone: null,
        whatsapp_opted_in: true,
        is_active: false,
        expires_at: null,
      },
      requireActivePortal: true,
    });
    assert.equal(result.canSend, false);
    assert.match(result.reason ?? "", /disabled/i);
  });
});
