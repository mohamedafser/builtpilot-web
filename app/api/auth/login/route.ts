import { apiError } from "@/lib/api/response";
import { toAuthResponse } from "@/lib/auth/http";
import { performLogin, resolveAuthOrigin } from "@/lib/auth/service";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const payload =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const { next, ...credentials } = payload;

  return toAuthResponse(
    await performLogin(
      credentials,
      typeof next === "string" ? next : null,
      resolveAuthOrigin(request),
    ),
  );
}
