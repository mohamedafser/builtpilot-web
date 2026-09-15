export const QUOTATION_ESTIMATE_DRAFT_KEY = "bp:quotation-estimate-draft";

export type QuotationEstimateDraft = {
  formValues: import("@/lib/validations/quotation").QuotationFormValues;
  savedAt: string;
};
