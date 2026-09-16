import { formatMoney } from "@/lib/i18n/money";

export * from "@/lib/i18n/config";
export { formatMoney } from "@/lib/i18n/money";
export { translate, translateWithParams, getDictionary } from "@/lib/i18n/messages";
export type { MessageKey } from "@/lib/i18n/messages";

/** @deprecated Prefer formatMoney — kept as alias for clarity at call sites. */
export const formatCurrencyAmount = formatMoney;
