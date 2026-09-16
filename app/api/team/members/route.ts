import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth";
import { resolveAuthOrigin } from "@/lib/app-url";
import { inviteTeamMember, listTeamMembers } from "@/lib/team/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  const result = await listTeamMembers(user);
  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Team members loaded.", result.data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "role" in body &&
    (body as { role?: string }).role === "owner"
  ) {
    return apiError("Owner role cannot be assigned through invitations", 403);
  }

  const result = await inviteTeamMember(user, body, {
    origin: resolveAuthOrigin(request),
  });
  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Invitation email sent.", result.data);
}
