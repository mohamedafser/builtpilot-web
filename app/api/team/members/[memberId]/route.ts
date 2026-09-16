import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth";
import { removeTeamMember, updateTeamMemberRole } from "@/lib/team/service";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  const { memberId } = await context.params;

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
    return apiError("Owner role cannot be assigned through member updates", 403);
  }

  const result = await updateTeamMemberRole(user, {
    ...(typeof body === "object" && body !== null ? body : {}),
    memberId,
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Member role updated.", result.data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  const { memberId } = await context.params;
  const result = await removeTeamMember(user, memberId);

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Member removed.", result.data);
}
