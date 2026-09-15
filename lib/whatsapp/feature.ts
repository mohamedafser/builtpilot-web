/**
 * WhatsApp Business Cloud messaging (send API, settings, history).
 * Kept off until Meta production send is ready. Portal share-link stays available.
 *
 * Enable later with NEXT_PUBLIC_WHATSAPP_FEATURE_ENABLED=true
 */
export function isWhatsAppFeatureEnabled(): boolean {
  return (
    (process.env.NEXT_PUBLIC_WHATSAPP_FEATURE_ENABLED ?? "").trim().toLowerCase() ===
    "true"
  );
}
