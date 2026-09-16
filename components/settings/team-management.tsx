"use client";

import { RoleAccessGuide } from "@/components/settings/role-access-guide";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { INVITE_ROLES } from "@/constants/roles";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import type { OrganizationRole } from "@/lib/permissions/roles";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TeamMember = {
  id: string;
  userId: string;
  role: OrganizationRole;
  fullName: string | null;
  email: string | null;
  createdAt: string;
};

type TeamInvitation = {
  id: string;
  email: string;
  role: OrganizationRole;
  expiresAt: string;
  createdAt: string;
};

type TeamPayload = {
  members: TeamMember[];
  invitations: TeamInvitation[];
};

export function TeamManagement({
  initialData,
  currentUserId,
  canInvite,
  canManageRoles,
  canRemoveMembers,
  showRoleGuide = false,
}: {
  initialData: TeamPayload;
  currentUserId: string;
  canInvite: boolean;
  canManageRoles: boolean;
  canRemoveMembers: boolean;
  showRoleGuide?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [members, setMembers] = useState(initialData.members);
  const [invitations, setInvitations] = useState(initialData.invitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("engineer");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const canSubmitInvite = email.trim().length > 0;

  function refreshTeam() {
    startTransition(async () => {
      const result = await requestJson<TeamPayload>("/api/team/members", {
        method: "GET",
        notify: false,
      });

      if (result.ok) {
        setMembers(result.data.members);
        setInvitations(result.data.invitations);
      }

      router.refresh();
    });
  }

  function onInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setError(null);
    setMessage(null);
    setPendingAction("invite");

    startTransition(async () => {
      const result = await requestJson<{ email: string; role: OrganizationRole }>(
        "/api/team/members",
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
          notify: false,
        },
      );

      setPendingAction(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setEmail("");
      setMessage(`Invitation email sent to ${result.data.email}.`);
      refreshTeam();
    });
  }

  function onRoleChange(memberId: string, nextRole: OrganizationRole) {
    setError(null);
    setMessage(null);
    setPendingAction(`role:${memberId}`);

    startTransition(async () => {
      const result = await requestJson<{ memberId: string; role: OrganizationRole }>(
        `/api/team/members/${memberId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: nextRole }),
          notify: false,
        },
      );

      setPendingAction(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? { ...member, role: nextRole } : member,
        ),
      );
      setMessage("Member role updated.");
    });
  }

  function onRemove(memberId: string) {
    setError(null);
    setMessage(null);
    setPendingAction(`remove:${memberId}`);

    startTransition(async () => {
      const result = await requestJson<{ memberId: string }>(
        `/api/team/members/${memberId}`,
        { method: "DELETE", notify: false },
      );

      setPendingAction(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMembers((current) => current.filter((member) => member.id !== memberId));
      setMessage("Member removed.");
    });
  }

  function onRemoveInvitation(invitationId: string) {
    setError(null);
    setMessage(null);
    setPendingAction(`cancel:${invitationId}`);

    startTransition(async () => {
      const result = await requestJson<{ invitationId: string }>(
        `/api/team/invitations/${invitationId}`,
        { method: "DELETE", notify: false },
      );

      setPendingAction(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      setMessage("Invitation cancelled.");
    });
  }

  function onResendInvitation(invitationId: string) {
    setError(null);
    setMessage(null);
    setPendingAction(`resend:${invitationId}`);

    startTransition(async () => {
      const result = await requestJson<{ email: string; role: OrganizationRole }>(
        `/api/team/invitations/${invitationId}`,
        { method: "POST", notify: false },
      );

      setPendingAction(null);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(`Invitation email resent to ${result.data.email}.`);
      refreshTeam();
    });
  }

  return (
    <div className="space-y-6">
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {canInvite ? (
        <form
          onSubmit={onInvite}
          className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5"
        >
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h3 className="text-sm font-semibold text-stone-900">
              {t("common.invite")}
            </h3>
            <p className="text-xs text-stone-500">
              {t("settings.teamSubtitle")}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="invite_email" className="text-xs">
                {t("settings.inviteEmail")}
              </Label>
              <Input
                id="invite_email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
                className="mt-1 h-9"
                required
              />
            </div>

            <div className="w-full shrink-0 md:w-40">
              <Label htmlFor="invite_role" className="text-xs">
                {t("settings.inviteRole")}
              </Label>
              <Select
                id="invite_role"
                className="mt-1 h-9"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as OrganizationRole)
                }
              >
                {INVITE_ROLES.map((inviteRole) => (
                  <option key={inviteRole} value={inviteRole}>
                    {t(`roles.${inviteRole}` as MessageKey)}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!canSubmitInvite || pendingAction === "invite"}
              className="h-9 shrink-0 md:w-auto"
            >
              {pendingAction === "invite"
                ? t("settings.inviteSending")
                : t("settings.inviteSend")}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900">
          {t("settings.members")} ({members.length})
        </h3>
        <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {members.length === 0 ? (
            <p className="px-4 py-4 text-sm text-stone-500">
              {t("settings.noMembers")}
            </p>
          ) : null}
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const canRemoveThisMember =
              canRemoveMembers && member.role !== "owner" && !isCurrentUser;

            return (
            <div
              key={member.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {member.fullName ?? "Team member"}
                  {isCurrentUser ? (
                    <span className="ml-2 text-xs font-normal text-stone-500">
                      ({t("settings.you")})
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-stone-500">{member.email ?? "—"}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canManageRoles && member.role !== "owner" && !isCurrentUser ? (
                  <Select
                    value={member.role}
                    onChange={(event) =>
                      onRoleChange(
                        member.id,
                        event.target.value as OrganizationRole,
                      )
                    }
                    className="h-10 min-w-[10rem]"
                    disabled={pendingAction === `role:${member.id}`}
                  >
                    {INVITE_ROLES.map((inviteRole) => (
                      <option key={inviteRole} value={inviteRole}>
                        {t(`roles.${inviteRole}` as MessageKey)}
                      </option>
                    ))}
                    {member.role === "member" ? (
                      <option value="member">
                        {t("roles.member")}
                      </option>
                    ) : null}
                  </Select>
                ) : (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                    {t(`roles.${member.role}` as MessageKey)}
                  </span>
                )}

                {canRemoveThisMember ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingAction === `remove:${member.id}`}
                    onClick={() => onRemove(member.id)}
                  >
                    {pendingAction === `remove:${member.id}`
                      ? t("common.loading")
                      : t("settings.removeMember")}
                  </Button>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">
            {t("settings.pendingInvites")} ({invitations.length})
          </h3>
          <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {invitations.map((invitation) => {
              const isExpired =
                new Date(invitation.expiresAt).getTime() < Date.now();
              const isResending = pendingAction === `resend:${invitation.id}`;
              const isCancelling = pendingAction === `cancel:${invitation.id}`;

              return (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {invitation.email}
                    </p>
                    <p className="text-sm text-stone-500">
                      {t(`roles.${invitation.role}` as MessageKey)}
                      {" · "}
                      <span className={isExpired ? "text-red-600" : undefined}>
                        {isExpired
                          ? "Expired"
                          : `${t("settings.expires")} ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canInvite ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isResending}
                        onClick={() => onResendInvitation(invitation.id)}
                      >
                        {isResending
                          ? t("settings.inviteSending")
                          : t("settings.resendInvite")}
                      </Button>
                    ) : null}
                    {canRemoveMembers ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isCancelling}
                        onClick={() => onRemoveInvitation(invitation.id)}
                      >
                        {isCancelling
                          ? t("common.loading")
                          : t("settings.cancelInvite")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : canInvite ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">
            {t("settings.pendingInvites")}
          </h3>
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-500">
            {t("settings.noInvites")}
          </p>
        </div>
      ) : null}

      {showRoleGuide ? <RoleAccessGuide compact /> : null}
    </div>
  );
}
