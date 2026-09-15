import type { WhatsAppEligibility } from "@/lib/whatsapp/types";

export function communicationBlockedReason(
  eligibility: WhatsAppEligibility,
  kind: "portal_link" | "update" | "quotation",
): string | null {
  if (eligibility.canSend) {
    return null;
  }

  if (kind === "portal_link" && !eligibility.portalActive) {
    return "Enable the client portal before sharing the portal link.";
  }

  if (!eligibility.whatsappEnabled || !eligibility.optedIn) {
    return "WhatsApp updates are not enabled for this client.";
  }

  return eligibility.reason ?? "WhatsApp sharing is not enabled for this client.";
}
