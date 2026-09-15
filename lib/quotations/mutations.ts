import { isDiscountType } from "@/constants/quotation";
import { getCurrentUser } from "@/lib/auth";
import { todayIsoDate } from "@/lib/labour/money";
import { createBusinessNotifications } from "@/lib/notifications/create";
import {
  completeReviewQuotationAction,
  createReviewQuotationAction,
} from "@/lib/project-actions/workflows";
import { createProject } from "@/lib/projects/mutations";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import {
  calculateQuotationItems,
  calculateQuotationTotals,
  shiftedValidUntil,
} from "@/lib/quotations/calculations";
import {
  emptyToNull,
  getQuotationErrorMessage,
  isUuid,
  type QuotationMutationResult,
} from "@/lib/quotations/helpers";
import { sendQuotationEmail } from "@/lib/quotations/email";
import { getQuotationById, loadQuotationById } from "@/lib/quotations/queries";
import {
  buildQuotationResponseUrl,
  generateQuotationResponseToken,
  getAppBaseUrl,
  hashQuotationResponseToken,
} from "@/lib/quotations/response-tokens";
import type {
  CalculatedQuotationItem,
  QuotationLineInput,
} from "@/lib/quotations/types";
import { createClient } from "@/lib/supabase/server";
import { getZodErrorMessage } from "@/lib/validations/error";
import {
  createQuotationSchema,
  rejectQuotationSchema,
  updateQuotationSchema,
} from "@/lib/validations/quotation";
import type { DiscountType } from "@/types";

function parseDiscountType(value: string | undefined): DiscountType | null {
  if (!value || !isDiscountType(value)) {
    return null;
  }

  return value;
}

function toLineInputs(
  items: Array<{
    item_type: QuotationLineInput["item_type"];
    material_id?: string;
    worker_id?: string;
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
    notes?: string;
  }>,
): QuotationLineInput[] {
  return items.map((item) => ({
    item_type: item.item_type,
    material_id:
      item.item_type === "material" ? emptyToNull(item.material_id) : null,
    worker_id: item.item_type === "labour" ? emptyToNull(item.worker_id) : null,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    notes: emptyToNull(item.notes),
  }));
}

async function assertProjectInBusiness(
  projectId: string | null,
  businessId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (!projectId) {
    return { ok: true };
  }

  if (!isUuid(projectId)) {
    return { ok: false, error: "Select a valid project." };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      ok: false,
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  if (projectResult.project.business_id !== businessId) {
    return {
      ok: false,
      error: "That project was not found in this workspace.",
      status: 400,
    };
  }

  return { ok: true };
}

async function assertMaterialsInBusiness(
  items: QuotationLineInput[],
  businessId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const materialIds = [
    ...new Set(
      items.flatMap((item) =>
        item.item_type === "material" && item.material_id
          ? [item.material_id]
          : [],
      ),
    ),
  ];

  if (materialIds.length === 0) {
    return { ok: true };
  }

  if (materialIds.some((id) => !isUuid(id))) {
    return { ok: false, error: "Select a valid material." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id")
    .eq("business_id", businessId)
    .in("id", materialIds);

  if (error) {
    return { ok: false, error: getQuotationErrorMessage(error) };
  }

  if ((data ?? []).length !== materialIds.length) {
    return {
      ok: false,
      error: "That material was not found in this workspace.",
      status: 400,
    };
  }

  return { ok: true };
}

async function assertWorkersInBusiness(
  items: QuotationLineInput[],
  businessId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const workerIds = [
    ...new Set(
      items.flatMap((item) =>
        item.item_type === "labour" && item.worker_id ? [item.worker_id] : [],
      ),
    ),
  ];

  if (workerIds.length === 0) {
    return { ok: true };
  }

  if (workerIds.some((id) => !isUuid(id))) {
    return { ok: false, error: "Select a valid worker." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .select("id")
    .eq("business_id", businessId)
    .in("id", workerIds);

  if (error) {
    return { ok: false, error: getQuotationErrorMessage(error) };
  }

  if ((data ?? []).length !== workerIds.length) {
    return {
      ok: false,
      error: "That worker was not found in this workspace.",
      status: 400,
    };
  }

  return { ok: true };
}

async function nextQuotationNumber(
  businessId: string,
): Promise<{ number: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_quotation_number", {
    target_business_id: businessId,
  });

  if (error || !data) {
    return {
      error: error
        ? getQuotationErrorMessage(error)
        : "Unable to generate a quotation number.",
    };
  }

  return { number: data };
}

async function insertItems(
  quotationId: string,
  businessId: string,
  items: CalculatedQuotationItem[],
) {
  const supabase = await createClient();
  const { error } = await supabase.from("quotation_items").insert(
    items.map((item) => ({
      quotation_id: quotationId,
      business_id: businessId,
      item_type: item.item_type,
      material_id: item.material_id,
      worker_id: item.worker_id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      sort_order: item.sort_order,
      notes: item.notes,
    })),
  );

  return error;
}

async function replaceItems(
  quotationId: string,
  businessId: string,
  items: CalculatedQuotationItem[],
) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("quotation_items")
    .delete()
    .eq("quotation_id", quotationId)
    .eq("business_id", businessId);

  if (deleteError) {
    return deleteError;
  }

  return insertItems(quotationId, businessId, items);
}

export async function createQuotation(
  values: unknown,
  lockedProjectId?: string,
): Promise<QuotationMutationResult> {
  const parsed = createQuotationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the quotation details."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message };
  }

  const projectId = lockedProjectId
    ? lockedProjectId
    : emptyToNull(parsed.data.project_id);

  if (
    lockedProjectId &&
    parsed.data.project_id &&
    parsed.data.project_id !== lockedProjectId
  ) {
    return {
      error: "This quotation is already linked to the current project.",
    };
  }

  const projectCheck = await assertProjectInBusiness(
    projectId,
    scope.business.id,
  );

  if (!projectCheck.ok) {
    return { error: projectCheck.error, status: projectCheck.status };
  }

  const lineInputs = toLineInputs(parsed.data.items);
  const materialCheck = await assertMaterialsInBusiness(
    lineInputs,
    scope.business.id,
  );

  if (!materialCheck.ok) {
    return { error: materialCheck.error, status: materialCheck.status };
  }

  const workerCheck = await assertWorkersInBusiness(
    lineInputs,
    scope.business.id,
  );

  if (!workerCheck.ok) {
    return { error: workerCheck.error, status: workerCheck.status };
  }

  const calculatedItems = calculateQuotationItems(lineInputs);

  if ("error" in calculatedItems) {
    return { error: calculatedItems.error };
  }

  const discountType = parseDiscountType(parsed.data.discount_type);
  const totals = calculateQuotationTotals({
    items: calculatedItems,
    discount_type: discountType,
    discount_value: parsed.data.discount_value,
    tax_percentage: parsed.data.tax_percentage,
  });

  const numberResult = await nextQuotationNumber(scope.business.id);

  if ("error" in numberResult) {
    return { error: numberResult.error };
  }

  const sendNow = parsed.data.submit_action === "send";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .insert({
      business_id: scope.business.id,
      project_id: projectId,
      quotation_number: numberResult.number,
      title: parsed.data.title,
      client_name: parsed.data.client_name,
      client_phone: emptyToNull(parsed.data.client_phone),
      client_email: emptyToNull(parsed.data.client_email),
      client_address: emptyToNull(parsed.data.client_address),
      quotation_date: parsed.data.quotation_date,
      valid_until: emptyToNull(parsed.data.valid_until),
      subtotal: totals.subtotal,
      discount_type: totals.discount_type,
      discount_value: totals.discount_value,
      discount_amount: totals.discount_amount,
      tax_percentage: totals.tax_percentage,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
      notes: emptyToNull(parsed.data.notes),
      terms: emptyToNull(parsed.data.terms),
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getQuotationErrorMessage(error)
        : "Unable to save this quotation.",
    };
  }

  const itemsError = await insertItems(
    data.id,
    scope.business.id,
    calculatedItems,
  );

  if (itemsError) {
    await supabase.from("quotations").delete().eq("id", data.id);
    return { error: getQuotationErrorMessage(itemsError) };
  }

  if (projectId) {
    void createReviewQuotationAction({
      businessId: scope.business.id,
      projectId,
      quotationId: data.id,
      quotationNumber: numberResult.number,
    });
  }

  if (sendNow) {
    return markQuotationSent(data.id);
  }

  return { success: true, id: data.id };
}

export async function updateQuotation(
  quotationId: string,
  values: unknown,
): Promise<QuotationMutationResult> {
  if (!isUuid(quotationId)) {
    return { error: "Quotation not found.", status: 404 };
  }

  const parsed = updateQuotationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the quotation details."),
    };
  }

  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.quotation.status !== "draft") {
    return { error: "Only draft quotations can be edited." };
  }

  const projectId = existing.quotation.project_id
    ? existing.quotation.project_id
    : emptyToNull(parsed.data.project_id);

  if (
    existing.quotation.project_id &&
    parsed.data.project_id &&
    parsed.data.project_id !== existing.quotation.project_id
  ) {
    return { error: "This quotation is already linked to a project." };
  }

  const projectCheck = await assertProjectInBusiness(
    projectId,
    existing.quotation.business_id,
  );

  if (!projectCheck.ok) {
    return { error: projectCheck.error, status: projectCheck.status };
  }

  const lineInputs = toLineInputs(parsed.data.items);
  const materialCheck = await assertMaterialsInBusiness(
    lineInputs,
    existing.quotation.business_id,
  );

  if (!materialCheck.ok) {
    return { error: materialCheck.error, status: materialCheck.status };
  }

  const workerCheck = await assertWorkersInBusiness(
    lineInputs,
    existing.quotation.business_id,
  );

  if (!workerCheck.ok) {
    return { error: workerCheck.error, status: workerCheck.status };
  }

  const calculatedItems = calculateQuotationItems(lineInputs);

  if ("error" in calculatedItems) {
    return { error: calculatedItems.error };
  }

  const discountType = parseDiscountType(parsed.data.discount_type);
  const totals = calculateQuotationTotals({
    items: calculatedItems,
    discount_type: discountType,
    discount_value: parsed.data.discount_value,
    tax_percentage: parsed.data.tax_percentage,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({
      project_id: projectId,
      title: parsed.data.title,
      client_name: parsed.data.client_name,
      client_phone: emptyToNull(parsed.data.client_phone),
      client_email: emptyToNull(parsed.data.client_email),
      client_address: emptyToNull(parsed.data.client_address),
      quotation_date: parsed.data.quotation_date,
      valid_until: emptyToNull(parsed.data.valid_until),
      subtotal: totals.subtotal,
      discount_type: totals.discount_type,
      discount_value: totals.discount_value,
      discount_amount: totals.discount_amount,
      tax_percentage: totals.tax_percentage,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
      notes: emptyToNull(parsed.data.notes),
      terms: emptyToNull(parsed.data.terms),
    })
    .eq("id", quotationId)
    .eq("business_id", existing.quotation.business_id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { error: "Quotation not found.", status: 404 };
  }

  const itemsError = await replaceItems(
    quotationId,
    existing.quotation.business_id,
    calculatedItems,
  );

  if (itemsError) {
    return { error: getQuotationErrorMessage(itemsError) };
  }

  if (parsed.data.submit_action === "send") {
    return markQuotationSent(quotationId);
  }

  return { success: true, id: quotationId };
}

export async function markQuotationSent(
  quotationId: string,
): Promise<QuotationMutationResult> {
  const existing = await loadQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.quotation.status === "sent") {
    return { error: "This quotation has already been sent." };
  }

  if (existing.quotation.status !== "draft") {
    return { error: "Only draft quotations can be marked as sent." };
  }

  const clientEmail = existing.quotation.client_email?.trim() ?? "";

  if (!clientEmail) {
    return { error: "Add a client email before sending this quotation." };
  }

  const user = await getCurrentUser();
  const responseToken = generateQuotationResponseToken();
  const responseTokenHash = hashQuotationResponseToken(responseToken);
  const origin = getAppBaseUrl();
  const acceptUrl = buildQuotationResponseUrl(origin, responseToken, "accept");
  const rejectUrl = buildQuotationResponseUrl(origin, responseToken, "reject");

  const emailed = await sendQuotationEmail(
    {
      ...existing.quotation,
      acceptUrl,
      rejectUrl,
    },
    user?.email,
  );

  if (!emailed.ok) {
    return { error: emailed.error };
  }

  const sent = await transitionQuotationStatus(quotationId, "sent", {
    from: "draft",
    already: "This quotation has already been sent.",
    invalid: "Only draft quotations can be marked as sent.",
    extra: {
      response_token_hash: responseTokenHash,
      response_token_created_at: new Date().toISOString(),
    },
  });

  if ("error" in sent) {
    return sent;
  }

  void createBusinessNotifications({
    businessId: existing.quotation.business_id,
    projectId: existing.quotation.project_id,
    type: "quotation",
    title: "Quotation sent",
    message: `Quotation ${existing.quotation.quotation_number} was sent.`,
    actionUrl: `/quotations/${quotationId}`,
    dedupeKey: `quotation_sent:${quotationId}`,
    preferenceKey: "quotation_notifications",
  });

  return { success: true, id: quotationId, emailedTo: clientEmail };
}

export async function markQuotationAccepted(
  quotationId: string,
): Promise<QuotationMutationResult> {
  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.quotation.effective_status === "expired") {
    return { error: "Expired quotations cannot be accepted." };
  }

  const accepted = await transitionQuotationStatus(quotationId, "accepted", {
    from: "sent",
    already: "This quotation is already accepted.",
    invalid: "Only sent quotations can be marked as accepted.",
    extra: {
      response_token_hash: null,
      response_token_created_at: null,
    },
  });

  if ("error" in accepted) {
    return accepted;
  }

  void createBusinessNotifications({
    businessId: existing.quotation.business_id,
    projectId: existing.quotation.project_id,
    type: "quotation",
    title: "Quotation accepted",
    message: `Quotation ${existing.quotation.quotation_number} was accepted.`,
    actionUrl: `/quotations/${quotationId}`,
    dedupeKey: `quotation_accepted:${quotationId}`,
    preferenceKey: "quotation_notifications",
  });

  if (existing.quotation.project_id) {
    void completeReviewQuotationAction(
      existing.quotation.project_id,
      quotationId,
    );
  }

  return accepted;
}

export async function markQuotationRejected(
  quotationId: string,
  values: unknown = {},
): Promise<QuotationMutationResult> {
  const parsed = rejectQuotationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the rejection reason."),
    };
  }

  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.quotation.effective_status === "expired") {
    return { error: "Expired quotations cannot be rejected." };
  }

  if (existing.quotation.status !== "sent") {
    return {
      error:
        existing.quotation.status === "rejected"
          ? "This quotation is already rejected."
          : "Only sent quotations can be marked as rejected.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "rejected",
      rejection_reason: emptyToNull(parsed.data.rejection_reason),
      response_token_hash: null,
      response_token_created_at: null,
    })
    .eq("id", quotationId)
    .eq("business_id", existing.quotation.business_id)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { error: "Quotation not found.", status: 404 };
  }

  void createBusinessNotifications({
    businessId: existing.quotation.business_id,
    projectId: existing.quotation.project_id,
    type: "quotation",
    title: "Quotation rejected",
    message: `Quotation ${existing.quotation.quotation_number} was marked as rejected.`,
    actionUrl: `/quotations/${quotationId}`,
    dedupeKey: `quotation_rejected:${quotationId}`,
    preferenceKey: "quotation_notifications",
  });

  if (existing.quotation.project_id) {
    void completeReviewQuotationAction(
      existing.quotation.project_id,
      quotationId,
    );
  }

  return { success: true, id: quotationId };
}

export async function markQuotationCancelled(
  quotationId: string,
): Promise<QuotationMutationResult> {
  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (
    existing.quotation.status !== "draft" &&
    existing.quotation.status !== "sent"
  ) {
    return { error: "Only draft or sent quotations can be cancelled." };
  }

  if (existing.quotation.effective_status === "expired") {
    return { error: "Expired quotations cannot be cancelled." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "cancelled",
      response_token_hash: null,
      response_token_created_at: null,
    })
    .eq("id", quotationId)
    .eq("business_id", existing.quotation.business_id)
    .in("status", ["draft", "sent"])
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { error: "Quotation not found.", status: 404 };
  }

  if (existing.quotation.project_id) {
    void completeReviewQuotationAction(
      existing.quotation.project_id,
      quotationId,
    );
  }

  return { success: true, id: quotationId };
}

async function transitionQuotationStatus(
  quotationId: string,
  nextStatus: "sent" | "accepted",
  messages: {
    from: "draft" | "sent";
    already: string;
    invalid: string;
    extra?: {
      response_token_hash?: string | null;
      response_token_created_at?: string | null;
    };
  },
): Promise<QuotationMutationResult> {
  if (!isUuid(quotationId)) {
    return { error: "Quotation not found.", status: 404 };
  }

  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.quotation.status === nextStatus) {
    return { error: messages.already };
  }

  if (existing.quotation.status !== messages.from) {
    return { error: messages.invalid };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: nextStatus,
      ...(messages.extra ?? {}),
    })
    .eq("id", quotationId)
    .eq("business_id", existing.quotation.business_id)
    .eq("status", messages.from)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { error: "Quotation not found.", status: 404 };
  }

  return { success: true, id: quotationId };
}

export async function duplicateQuotation(
  quotationId: string,
): Promise<QuotationMutationResult> {
  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const quotation = existing.quotation;
  const today = todayIsoDate();

  return createQuotation({
    title: quotation.title,
    client_name: quotation.client_name,
    client_phone: quotation.client_phone ?? "",
    client_email: quotation.client_email ?? "",
    client_address: quotation.client_address ?? "",
    quotation_date: today,
    valid_until:
      shiftedValidUntil(
        quotation.quotation_date,
        quotation.valid_until,
        today,
      ) ?? "",
    project_id: quotation.project_id ?? "",
    discount_type: quotation.discount_type ?? "",
    discount_value: quotation.discount_value,
    tax_percentage: quotation.tax_percentage ?? "",
    notes: quotation.notes ?? "",
    terms: quotation.terms ?? "",
    submit_action: "draft",
    items: quotation.items.map((item) => ({
      item_type: item.item_type,
      material_id: item.material_id ?? "",
      worker_id: item.worker_id ?? "",
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      notes: item.notes ?? "",
    })),
  });
}

export async function convertQuotationToProject(
  quotationId: string,
): Promise<QuotationMutationResult & { projectId?: string }> {
  const existing = await getQuotationById(quotationId);

  if (existing.error === "not_found" || !existing.quotation) {
    return {
      error:
        existing.error === "not_found"
          ? "Quotation not found."
          : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const quotation = existing.quotation;

  if (quotation.status !== "accepted") {
    return { error: "Only accepted quotations can be converted to a project." };
  }

  if (quotation.project_id) {
    return { error: "Already linked to project.", status: 400 };
  }

  const created = await createProject({
    name: quotation.title.slice(0, 120),
    client_name: quotation.client_name ?? "",
    client_phone: quotation.client_phone ?? "",
    client_email: quotation.client_email ?? "",
    location: (quotation.client_address ?? "").slice(0, 200),
    description: "",
    estimated_budget:
      quotation.total_amount == null || quotation.total_amount === ""
        ? ""
        : String(quotation.total_amount),
    status: "planning",
    start_date: "",
    expected_end_date: "",
  });

  if ("error" in created || !created.id) {
    return {
      error:
        "error" in created
          ? created.error
          : "Unable to create a project from this quotation.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .update({ project_id: created.id })
    .eq("id", quotationId)
    .eq("business_id", quotation.business_id)
    .eq("status", "accepted")
    .is("project_id", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return {
      error: "The project was created but the quotation could not be linked.",
      status: 400,
    };
  }

  return { success: true, id: quotationId, projectId: created.id };
}
