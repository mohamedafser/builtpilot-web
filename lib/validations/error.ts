import { z } from "zod";

type ZodIssueLike = {
  code: string;
  message: string;
  path: PropertyKey[];
};

const GENERIC_ISSUE_PATTERN =
  /^(invalid input|invalid type|invalid option|invalid value|invalid enum value|expected string|expected number|required)(:|\s|$)/i;

const FIELD_MESSAGES: Record<string, string> = {
  adjustment_direction: "Select increase or decrease.",
  attendance_date: "Enter a valid date.",
  amount: "Amount must be greater than 0.",
  category: "Select a valid category.",
  description: "Description is required.",
  expense_date: "Enter a valid date.",
  entries: "Mark attendance for at least one worker.",
  hours_worked: "Hours must be between 0 and 24.",
  default_unit_price: "Price must be 0 or greater, with up to 2 decimal places.",
  material_id: "Select a valid material.",
  minimum_stock: "Quantity must be 0 or greater, with up to 3 decimal places.",
  notes: "Notes are too long.",
  payment_method: "Select a payment method.",
  planned_quantity: "Quantity must be 0 or greater, with up to 3 decimal places.",
  project_id: "Select a valid project.",
  project_ids: "Select at least one project.",
  quantity: "Enter a valid quantity.",
  reference_number: "Reference number is too long.",
  status: "Select present, half day, or absent.",
  transaction_date: "Enter a valid date.",
  unit: "Select a unit.",
  unit_price: "Price must be 0 or greater, with up to 2 decimal places.",
  vendor_id: "Select a valid vendor.",
  title: "Title is required.",
  client_name: "Client name is required.",
  quotation_date: "Enter a valid date.",
  valid_until: "Enter a valid date.",
  discount_type: "Select a discount type.",
  discount_value: "Enter a valid discount.",
  tax_percentage: "Enter a valid tax percentage.",
  items: "Add at least one item.",
  item_type: "Select an item type.",
  submit_action: "Choose whether to save as draft or send.",
  rejection_reason: "Rejection reason is too long.",
  terms: "Terms are too long.",
  worker_id: "Select a valid worker.",
  worker_ids: "Select at least one worker.",
  name: "Name is required.",
  estimated_quantity: "Estimated quantity must be greater than 0.",
  rate: "Rate must be 0 or greater.",
  measurement_date: "Enter a valid date.",
  location: "Location is too long.",
  reference: "Reference is too long.",
  quotation_id: "Select a valid quotation.",
  section_id: "Select a valid section.",
  item_code: "Item code is too long.",
  ids: "Select items to reorder.",
};

function lastField(path: PropertyKey[]): string | undefined {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const part = path[index];

    if (typeof part === "string") {
      return part;
    }
  }

  return undefined;
}

function isGenericIssueMessage(message: string): boolean {
  return GENERIC_ISSUE_PATTERN.test(message.trim());
}

export function getZodErrorMessage(error: z.ZodError, fallback: string): string {
  const issue = error.issues[0] as ZodIssueLike | undefined;

  if (!issue) {
    return fallback;
  }

  if (!isGenericIssueMessage(issue.message)) {
    return issue.message;
  }

  const field = lastField(issue.path);

  if (field && FIELD_MESSAGES[field]) {
    return FIELD_MESSAGES[field];
  }

  return fallback;
}
