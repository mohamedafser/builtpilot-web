import { createBusinessNotifications } from "@/lib/notifications/create";
import { completeReviewQuotationAction } from "@/lib/project-actions/workflows";
import { effectiveQuotationStatus } from "@/lib/quotations/calculations";
import { emptyToNull, getQuotationErrorMessage } from "@/lib/quotations/helpers";
import {
  hashQuotationResponseToken,
  isQuotationResponseToken,
  normalizeQuotationResponseToken,
} from "@/lib/quotations/response-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { getZodErrorMessage } from "@/lib/validations/error";
import { rejectQuotationSchema } from "@/lib/validations/quotation";
import type { QuotationStatus } from "@/types";
import { todayIsoDate } from "@/lib/labour/money";

export type PublicQuotationResponseView = {
  id: string;
  quotation_number: string;
  title: string;
  client_name: string;
  quotation_date: string;
  valid_until: string | null;
  total_amount: string;
  business_name: string;
  status: QuotationStatus;
  effective_status: QuotationStatus;
  can_respond: boolean;
  message: string | null;
};

type LookupRow = {
  id: string;
  business_id: string;
  project_id: string | null;
  quotation_number: string;
  title: string;
  client_name: string;
  quotation_date: string;
  valid_until: string | null;
  total_amount: string | number;
  status: QuotationStatus;
  response_token_hash: string | null;
  businesses: { name: string } | { name: string }[] | null;
};

function businessName(
  businesses: LookupRow["businesses"],
): string {
  if (!businesses) return "BuildPilot";
  if (Array.isArray(businesses)) {
    return businesses[0]?.name ?? "BuildPilot";
  }
  return businesses.name || "BuildPilot";
}

function adminOrError():
  | { admin: NonNullable<ReturnType<typeof createAdminClient>> }
  | { error: string } {
  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Public quotation responses are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  return { admin };
}

export async function getPublicQuotationByResponseToken(
  token: string,
): Promise<
  | { quotation: PublicQuotationResponseView }
  | { error: string; status?: number }
> {
  if (!isQuotationResponseToken(token)) {
    return { error: "This response link is invalid.", status: 404 };
  }

  const client = adminOrError();
  if ("error" in client) {
    return { error: client.error, status: 503 };
  }

  const hash = hashQuotationResponseToken(
    normalizeQuotationResponseToken(token),
  );

  const { data, error } = await client.admin
    .from("quotations")
    .select(
      `
      id,
      business_id,
      project_id,
      quotation_number,
      title,
      client_name,
      quotation_date,
      valid_until,
      total_amount,
      status,
      response_token_hash,
      businesses!inner ( name )
    `,
    )
    .eq("response_token_hash", hash)
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return {
      error: "This response link is invalid or has already been used.",
      status: 404,
    };
  }

  const row = data as LookupRow;
  const effective = effectiveQuotationStatus(
    row.status,
    row.valid_until,
    todayIsoDate(),
  );
  const canRespond = row.status === "sent" && effective !== "expired";

  let message: string | null = null;
  if (row.status === "accepted") {
    message = "You have already accepted this quotation. Thank you.";
  } else if (row.status === "rejected") {
    message = "You have already rejected this quotation.";
  } else if (row.status === "cancelled") {
    message = "This quotation was cancelled by the contractor.";
  } else if (effective === "expired") {
    message = "This quotation has expired and can no longer be accepted.";
  } else if (row.status !== "sent") {
    message = "This quotation is no longer awaiting a response.";
  }

  return {
    quotation: {
      id: row.id,
      quotation_number: row.quotation_number,
      title: row.title,
      client_name: row.client_name,
      quotation_date: row.quotation_date,
      valid_until: row.valid_until,
      total_amount: String(row.total_amount),
      business_name: businessName(row.businesses),
      status: row.status,
      effective_status: effective,
      can_respond: canRespond,
      message,
    },
  };
}

export async function respondToQuotationViaToken(
  token: string,
  values: unknown,
): Promise<
  | { success: true; status: "accepted" | "rejected"; quotationId: string }
  | { error: string; status?: number }
> {
  const body = values as {
    action?: string;
    rejection_reason?: string;
  };

  if (body.action !== "accept" && body.action !== "reject") {
    return { error: "Choose accept or reject.", status: 400 };
  }

  if (!isQuotationResponseToken(token)) {
    return { error: "This response link is invalid.", status: 404 };
  }

  const client = adminOrError();
  if ("error" in client) {
    return { error: client.error, status: 503 };
  }

  const hash = hashQuotationResponseToken(
    normalizeQuotationResponseToken(token),
  );

  const { data: existing, error: loadError } = await client.admin
    .from("quotations")
    .select(
      `
      id,
      business_id,
      project_id,
      quotation_number,
      status,
      valid_until,
      response_token_hash
    `,
    )
    .eq("response_token_hash", hash)
    .maybeSingle();

  if (loadError) {
    return { error: getQuotationErrorMessage(loadError) };
  }

  if (!existing) {
    return {
      error: "This response link is invalid or has already been used.",
      status: 404,
    };
  }

  const effective = effectiveQuotationStatus(
    existing.status,
    existing.valid_until,
    todayIsoDate(),
  );

  if (existing.status === "accepted") {
    return { error: "This quotation is already accepted." };
  }

  if (existing.status === "rejected") {
    return { error: "This quotation is already rejected." };
  }

  if (effective === "expired") {
    return { error: "This quotation has expired." };
  }

  if (existing.status !== "sent") {
    return { error: "This quotation is no longer awaiting a response." };
  }

  if (body.action === "accept") {
    const { data, error } = await client.admin
      .from("quotations")
      .update({
        status: "accepted",
        response_token_hash: null,
        response_token_created_at: null,
      })
      .eq("id", existing.id)
      .eq("status", "sent")
      .eq("response_token_hash", hash)
      .select("id")
      .maybeSingle();

    if (error) {
      return { error: getQuotationErrorMessage(error) };
    }

    if (!data) {
      return { error: "Unable to accept this quotation. Please try again." };
    }

    void createBusinessNotifications({
      businessId: existing.business_id,
      projectId: existing.project_id,
      type: "quotation",
      title: "Quotation accepted",
      message: `Quotation ${existing.quotation_number} was accepted by the client.`,
      actionUrl: `/quotations/${existing.id}`,
      dedupeKey: `quotation_accepted:${existing.id}`,
      preferenceKey: "quotation_notifications",
    });

    if (existing.project_id) {
      void completeReviewQuotationAction(existing.project_id, existing.id);
    }

    return {
      success: true,
      status: "accepted",
      quotationId: existing.id,
    };
  }

  const parsed = rejectQuotationSchema.safeParse({
    rejection_reason: body.rejection_reason ?? "",
  });

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the rejection reason."),
    };
  }

  const { data, error } = await client.admin
    .from("quotations")
    .update({
      status: "rejected",
      rejection_reason: emptyToNull(parsed.data.rejection_reason),
      response_token_hash: null,
      response_token_created_at: null,
    })
    .eq("id", existing.id)
    .eq("status", "sent")
    .eq("response_token_hash", hash)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { error: "Unable to reject this quotation. Please try again." };
  }

  void createBusinessNotifications({
    businessId: existing.business_id,
    projectId: existing.project_id,
    type: "quotation",
    title: "Quotation rejected",
    message: `Quotation ${existing.quotation_number} was rejected by the client.`,
    actionUrl: `/quotations/${existing.id}`,
    dedupeKey: `quotation_rejected:${existing.id}`,
    preferenceKey: "quotation_notifications",
  });

  if (existing.project_id) {
    void completeReviewQuotationAction(existing.project_id, existing.id);
  }

  return {
    success: true,
    status: "rejected",
    quotationId: existing.id,
  };
}
