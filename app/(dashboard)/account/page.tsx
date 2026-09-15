import { LogoutButton } from "@/components/auth/logout-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMBER_ROLE_LABELS } from "@/constants/roles";
import { getWorkspaceContext } from "@/lib/auth";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LABELS,
  normalizeLanguage,
} from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import Link from "next/link";

export default async function AccountPage() {
  const { profile, business, user, role } = await getWorkspaceContext();
  const language = normalizeLanguage(profile?.language ?? DEFAULT_LANGUAGE);
  const displayName = profile?.full_name ?? user.email ?? "there";

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{translate(language, "account.title")}</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          {translate(language, "account.subtitle")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!business ? (
          <Alert variant="error">
            Your account does not have a business workspace yet.
          </Alert>
        ) : null}
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
            <dt className="text-stone-500">
              {translate(language, "account.name")}
            </dt>
            <dd className="font-medium text-stone-800">{displayName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
            <dt className="text-stone-500">
              {translate(language, "account.email")}
            </dt>
            <dd className="font-medium text-stone-800">{user.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
            <dt className="text-stone-500">
              {translate(language, "account.business")}
            </dt>
            <dd className="font-medium text-stone-800">
              {business?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
            <dt className="text-stone-500">
              {translate(language, "account.role")}
            </dt>
            <dd className="font-medium text-stone-800">
              {role ? MEMBER_ROLE_LABELS[role] : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">
              {translate(language, "account.language")}
            </dt>
            <dd className="font-medium text-stone-800">
              {LANGUAGE_LABELS[language]}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <LogoutButton fullWidth={false} />
          <Link
            href="/settings"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            {translate(language, "nav.settings")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}