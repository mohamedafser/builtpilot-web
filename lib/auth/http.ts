import { apiError, apiSuccess } from "@/lib/api/response";
import type { AuthServiceResult } from "@/lib/auth/service";

export function toAuthResponse<T>(result: AuthServiceResult<T>) {
  if (!result.ok) {
    return apiError(result.message, result.status);
  }

  return apiSuccess(result.message, result.data);
}
