import { NextResponse } from "next/server";
import {
  processWhatsAppWebhookPayload,
  verifyWhatsAppWebhookChallenge,
  verifyWhatsAppWebhookSignature,
} from "@/lib/whatsapp/webhook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verified = verifyWhatsAppWebhookChallenge({
    mode,
    token,
    challenge,
  });

  if (verified == null) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(verified, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppWebhookSignature(rawBody, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await processWhatsAppWebhookPayload(payload);
  } catch {
    // Do not expose internal errors to the provider.
  }

  return NextResponse.json({ ok: true });
}
