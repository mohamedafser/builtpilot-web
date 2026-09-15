import { WorkspacePreferencesForm } from "@/components/settings/workspace-preferences-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/auth";
import {
  DEFAULT_LANGUAGE,
  normalizeCountryCode,
  normalizeLanguage,
} from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export default async function SettingsPage() {
  const { profile, business } = await getWorkspaceContext();
  const language = normalizeLanguage(profile?.language ?? DEFAULT_LANGUAGE);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{translate(language, "settings.title")}</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          {translate(language, "settings.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-600">
          {translate(language, "settings.workspace")}:{" "}
          <span className="font-medium text-stone-800">
            {business?.name ?? "—"}
          </span>
        </p>
        <WorkspacePreferencesForm
          initialLanguage={language}
          initialCountryCode={normalizeCountryCode(business?.country_code)}
        />
      </CardContent>
    </Card>
  );
}
