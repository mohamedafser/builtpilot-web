import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { TeamManagement } from "@/components/settings/team-management";
import { UserPreferencesForm } from "@/components/settings/user-preferences-form";
import { getWorkspaceContext } from "@/lib/auth";
import {
  DEFAULT_LANGUAGE,
  normalizeCountryCode,
  normalizeLanguage,
} from "@/lib/i18n/config";
import { formatOrganizationRole, hasPermission } from "@/lib/permissions";
import { listTeamMembers } from "@/lib/team/service";

export default async function SettingsPage() {
  const { profile, business, role, user } = await getWorkspaceContext();
  const language = normalizeLanguage(profile?.language ?? DEFAULT_LANGUAGE);
  const canViewTeam = hasPermission(role, "organization.users.view");
  const canManageWorkspace = hasPermission(role, "organization.settings.manage");

  const teamResult =
    business && canViewTeam ? await listTeamMembers(user) : null;

  const teamData =
    teamResult?.ok === true
      ? teamResult.data
      : { members: [], invitations: [] };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-sm text-stone-500">
          Manage your organization, team access, and personal preferences.
        </p>
      </div>

      <SettingsTabs
        showTeam={canViewTeam}
        defaultTab={canViewTeam ? "organization" : "preferences"}
        organization={
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5">
                <p className="text-xs text-stone-500">Organization</p>
                <p className="text-sm font-medium text-stone-900">
                  {business?.name ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5">
                <p className="text-xs text-stone-500">Your role</p>
                <p className="text-sm font-medium text-stone-900">
                  {formatOrganizationRole(role)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Workspace region
              </h3>
              <OrganizationSettingsForm
                initialLanguage={language}
                initialCountryCode={normalizeCountryCode(business?.country_code)}
                canManageWorkspace={canManageWorkspace}
              />
            </div>
          </div>
        }
        team={
          <TeamManagement
            initialData={teamData}
            currentUserId={user.id}
            canInvite={hasPermission(role, "organization.users.invite")}
            canManageRoles={hasPermission(role, "organization.roles.manage")}
            canRemoveMembers={hasPermission(role, "organization.users.manage")}
            showRoleGuide={
              role === "owner" || role === "admin"
            }
          />
        }
        preferences={
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-stone-900">
              Personal settings
            </h3>
            <p className="text-xs text-stone-500">
              Language applies to your account only and does not change the
              organization workspace.
            </p>
            <UserPreferencesForm initialLanguage={language} />
          </div>
        }
      />
    </div>
  );
}
