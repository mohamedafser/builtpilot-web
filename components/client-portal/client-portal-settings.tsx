"use client";

import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HealthPill } from "@/components/projects/project-visuals";
import { WithIcon } from "@/components/ui/with-icon";
import { CLIENT_PORTAL_SETTING_LABELS } from "@/constants/client-portal";
import { requestJson } from "@/lib/api/client";
import {
  buildClientPortalShareUrl,
  clientPortalUrlStorageKey,
} from "@/lib/client-portal/helpers";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/lib/client-portal/permissions";
import type {
  ClientPortalSettings,
  ContractorClientPortalState,
} from "@/lib/client-portal/types";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Ban,
  Copy,
  Eye,
  Globe,
  MessageCircle,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function statusMeta(status: "active" | "inactive" | "expired" | "none") {
  if (status === "active") {
    return { label: "Active", tone: "good" as const };
  }
  if (status === "expired") {
    return { label: "Expired", tone: "bad" as const };
  }
  if (status === "inactive") {
    return { label: "Paused", tone: "warn" as const };
  }
  return { label: "Off", tone: "neutral" as const };
}

export function ClientPortalSettingsForm({
  state,
}: {
  state: ContractorClientPortalState;
}) {
  const router = useRouter();
  const [clientName, setClientName] = useState(state.access?.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(
    state.access?.client_email ?? "",
  );
  const [clientPhone, setClientPhone] = useState(
    state.access?.client_phone ?? "",
  );
  const [settings, setSettings] = useState<ClientPortalSettings>(
    state.settings ?? DEFAULT_CLIENT_PORTAL_SETTINGS,
  );
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const storageKey = clientPortalUrlStorageKey(state.project_id);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        setPortalUrl(stored);
      }
    } catch {
      // Ignore unavailable sessionStorage.
    }
  }, [storageKey]);

  function rememberPortalUrl(url: string | null) {
    setPortalUrl(url);

    try {
      if (url) {
        sessionStorage.setItem(storageKey, url);
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore unavailable sessionStorage.
    }
  }

  const shareUrl = portalUrl;
  const enabled = Boolean(state.access) || Boolean(shareUrl);
  const portalStatus =
    shareUrl && (state.access?.portal_status ?? "none") === "none"
      ? "active"
      : (state.access?.portal_status ?? "none");

  const initialClientName = state.access?.client_name ?? "";
  const initialClientEmail = state.access?.client_email ?? "";
  const initialClientPhone = state.access?.client_phone ?? "";
  const initialSettings = state.settings ?? DEFAULT_CLIENT_PORTAL_SETTINGS;
  const settingsDirty = CLIENT_PORTAL_SETTING_LABELS.some(
    (item) => settings[item.key] !== initialSettings[item.key],
  );
  const isDirty =
    clientName.trim() !== initialClientName.trim() ||
    clientEmail.trim() !== initialClientEmail.trim() ||
    clientPhone.trim() !== initialClientPhone.trim() ||
    settingsDirty;

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Client portal link copied", "success");
    } catch {
      showToast("Unable to copy the link. Copy it manually.", "error");
    }
  }

  async function enablePortal() {
    setFormError(null);
    setPending("enable");
    const result = await requestJson<{ token: string | null }>(
      `/api/projects/${state.project_id}/client-portal`,
      {
        method: "POST",
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          ...settings,
        }),
        notify: false,
      },
    );
    setPending(null);

    if (!result.ok) {
      setFormError(result.message);
      showToast(result.message, "error");
      return;
    }

    const token = result.data.token;

    if (token) {
      rememberPortalUrl(
        buildClientPortalShareUrl(window.location.origin, token),
      );
    }

    showToast("Client portal enabled.", "success");
  }

  async function saveSettings() {
    setFormError(null);
    setPending("save");
    const result = await requestJson<{ id: string }>(
      `/api/projects/${state.project_id}/client-portal`,
      {
        method: "PATCH",
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          ...settings,
        }),
      },
    );
    setPending(null);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    router.refresh();
  }

  async function regenerate() {
    if (
      !window.confirm(
        "Regenerating the link will invalidate the previous client portal link.",
      )
    ) {
      return;
    }

    setFormError(null);
    setPending("regenerate");
    const result = await requestJson<{ token: string | null }>(
      `/api/projects/${state.project_id}/client-portal/regenerate`,
      { method: "POST", notify: false },
    );
    setPending(null);

    if (!result.ok) {
      setFormError(result.message);
      showToast(result.message, "error");
      return;
    }

    const token = result.data.token;

    if (token) {
      rememberPortalUrl(
        buildClientPortalShareUrl(window.location.origin, token),
      );
    }

    showToast("Client portal link regenerated.", "success");
  }

  async function disablePortal() {
    setFormError(null);
    setPending("disable");
    const result = await requestJson<{ id: string }>(
      `/api/projects/${state.project_id}/client-portal/disable`,
      { method: "POST" },
    );
    setPending(null);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    rememberPortalUrl(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                portalStatus === "active"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : "bg-stone-50 text-stone-500 ring-1 ring-stone-100",
              )}
            >
              <Globe className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-stone-900">
                  Client portal
                </h2>
                <HealthPill
                  label={statusMeta(portalStatus).label}
                  tone={statusMeta(portalStatus).tone}
                />
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                Share a read-only project view with your client.
              </p>
            </div>
          </div>
          {portalStatus === "active" ? (
            <Link
              href={`/client/preview/${state.project_id}`}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={Eye}>Preview</WithIcon>
            </Link>
          ) : null}
        </div>

        {formError ? (
          <div className="mt-3">
            <Alert variant="error">{formError}</Alert>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="client_name">Client name</Label>
            <Input
              id="client_name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              required
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="client_email">Email</Label>
            <Input
              id="client_email"
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="client_phone">Phone</Label>
            <Input
              id="client_phone"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-stone-900">
            What the client can see
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            Turn sections on or off for the shared link.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CLIENT_PORTAL_SETTING_LABELS.map((item) => {
              const checked = settings[item.key];
              return (
                <label
                  key={item.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-stone-200 bg-white hover:bg-stone-50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-amber-600"
                    checked={checked}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-900">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-stone-500">
                      {item.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Share link</h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Public link for your client. Preview is only for you while signed
              in.
            </p>
          </div>

          {shareUrl ? (
            <div className="space-y-2 rounded-lg bg-stone-50 p-3">
              <p className="text-xs break-all text-stone-700">{shareUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void copyLink(shareUrl)}
                  icon={Copy}
                >
                  Copy link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Your BuildPilot project portal:\n${shareUrl}`,
                    );
                    window.open(
                      `https://wa.me/?text=${text}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  icon={MessageCircle}
                >
                  WhatsApp
                </Button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(linkButtonClassName("secondary", "sm"))}
                >
                  Open
                </a>
              </div>
              <p className="text-[11px] text-stone-500">
                Shown once for security. Copy it now, or regenerate later.
              </p>
            </div>
          ) : enabled ? (
            <p className="text-xs text-stone-600">
              The portal link was shown when created and is not stored. Regenerate
              if you no longer have it.
            </p>
          ) : (
            <p className="text-xs text-stone-600">
              Enable the portal to create a secure share link.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!enabled ||
            portalStatus === "inactive" ||
            portalStatus === "expired" ? (
              <Button
                size="sm"
                onClick={() => void enablePortal()}
                disabled={pending !== null || !clientName.trim()}
                icon={Share2}
              >
                {pending === "enable" ? "Enabling..." : "Enable portal"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void saveSettings()}
                disabled={pending !== null || !clientName.trim() || !isDirty}
                icon={Save}
              >
                {pending === "save" ? "Saving..." : "Save"}
              </Button>
            )}
            {enabled ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void regenerate()}
                disabled={pending !== null}
                icon={RefreshCw}
              >
                {pending === "regenerate" ? "Regenerating..." : "New link"}
              </Button>
            ) : null}
            {portalStatus === "active" ? (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void disablePortal()}
                  disabled={pending !== null}
                  icon={Ban}
                >
                  {pending === "disable" ? "Disabling..." : "Disable"}
                </Button>
                <Link
                  href={`/projects/${state.project_id}/ai?prompt=${encodeURIComponent("Create a client update")}`}
                  className={cn(linkButtonClassName("secondary", "sm"))}
                >
                  <WithIcon icon={Sparkles}>Client update</WithIcon>
                </Link>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
