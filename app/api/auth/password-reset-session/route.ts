import { toAuthResponse } from "@/lib/auth/http";
import { getPasswordResetSession } from "@/lib/auth/service";

export async function GET() {
  return toAuthResponse(await getPasswordResetSession());
}
