import { DatabaseSetupRequired } from "@/components/auth/database-setup-required";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getPublicSchemaStatus, getWorkspaceContext } from "@/lib/auth";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
} from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import type { ReactNode } from "react";

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const schemaStatus = await getPublicSchemaStatus();

  if (schemaStatus === "missing") {
    return <DatabaseSetupRequired />;
  }

  const { user, profile, business } = await getWorkspaceContext();
  const displayName = profile?.full_name ?? user.email ?? "there";

  return (
    <LocaleProvider
      language={profile?.language ?? DEFAULT_LANGUAGE}
      currencyCode={business?.currency_code ?? DEFAULT_CURRENCY}
      countryCode={business?.country_code ?? "IN"}
    >
      <DashboardShell businessName={business?.name} userName={displayName}>
        {children}
      </DashboardShell>
    </LocaleProvider>
  );
}