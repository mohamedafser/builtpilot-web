import { apiError, apiSuccess } from "@/lib/api/response";
import { respondToQuotationViaToken } from "@/lib/quotations/public-response";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await respondToQuotationViaToken(token, body);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess(
    result.status === "accepted"
      ? "Quotation accepted. Your contractor has been notified."
      : "Quotation rejected. Your contractor has been notified.",
    {
      status: result.status,
      id: result.quotationId,
    },
  );
}
