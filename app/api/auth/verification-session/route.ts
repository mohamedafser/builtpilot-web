import { toAuthResponse } from "@/lib/auth/http";
import { getEmailVerificationSession } from "@/lib/auth/service";

export async function GET() {
  return toAuthResponse(await getEmailVerificationSession());
}
