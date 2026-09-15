import { toAuthResponse } from "@/lib/auth/http";
import { performLogout } from "@/lib/auth/service";

export async function POST() {
  return toAuthResponse(await performLogout());
}
