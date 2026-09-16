import type { AppLanguage } from "@/lib/i18n/config";
import { ar } from "@/lib/i18n/messages/ar";
import { en, type MessageKey } from "@/lib/i18n/messages/en";
import { hi } from "@/lib/i18n/messages/hi";
import { ta } from "@/lib/i18n/messages/ta";

export type { MessageKey };

type Dictionary = Record<MessageKey, string>;

const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  ta,
  ar,
  hi,
};

export function translate(language: AppLanguage, key: MessageKey): string {
  return dictionaries[language][key] ?? dictionaries.en[key] ?? key;
}

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language] ?? dictionaries.en;
}

/** Replace `{name}` placeholders in a translated string. */
export function translateWithParams(
  language: AppLanguage,
  key: MessageKey,
  params: Record<string, string | number>,
): string {
  let message = translate(language, key);
  for (const [name, value] of Object.entries(params)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
