import { apiError, apiSuccess } from "@/lib/api/response";
import { resolveAuthOrigin } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { cancelInvitation, resendInvitation } from "@/lib/team/service";

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  const { invitationId } = await context.params;
  const result = await resendInvitation(user, invitationId, {
    origin: resolveAuthOrigin(request),
  });

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Invitation email resent.", result.data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("You must be signed in to continue.", 401);
  }

  const { invitationId } = await context.params;
  const result = await cancelInvitation(user, invitationId);

  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess("Invitation cancelled.", result.data);
}
