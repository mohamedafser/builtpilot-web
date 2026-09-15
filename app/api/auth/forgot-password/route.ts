import { apiError } from "@/lib/api/response";
import { toAuthResponse } from "@/lib/auth/http";
import {
  performForgotPassword,
  resolveAuthOrigin,
} from "@/lib/auth/service";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  return toAuthResponse(
    await performForgotPassword(body, resolveAuthOrigin(request)),
  );
}
