"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type WhatsAppSettingsProps = {
  projectId: string;
  clientName: string;
  clientPhone: string | null;
  whatsappPhone: string | null;
  whatsappEnabled: boolean;
  whatsappOptedIn: boolean;
};

export function WhatsAppSettings({
  projectId,
  clientName,
  clientPhone,
  whatsappPhone,
  whatsappEnabled,
  whatsappOptedIn,
}: WhatsAppSettingsProps) {
  const router = useRouter();
  const initialPhone = whatsappPhone ?? clientPhone ?? "";
  const initialEnabled = whatsappEnabled && whatsappOptedIn;
  const [phone, setPhone] = useState(initialPhone);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty =
    phone.trim() !== initialPhone.trim() || enabled !== initialEnabled;

  async function save() {
    setPending(true);
    setError(null);
    const result = await requestJson(
      `/api/projects/${projectId}/communication`,
      {
        method: "PATCH",
        body: JSON.stringify({
          whatsapp_enabled: enabled,
          whatsapp_opted_in: enabled,
          whatsapp_phone: phone,
          client_phone: phone,
        }),
        notify: false,
      },
    );
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, "error");
      return;
    }

    showToast("WhatsApp settings saved.", "success");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Client name</Label>
          <p className="mt-1 text-sm font-medium text-stone-900">{clientName}</p>
        </div>
        <div>
          <Label htmlFor="whatsapp_phone">WhatsApp number</Label>
          <Input
            id="whatsapp_phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-stone-500">
            Use international format. Example: +91XXXXXXXXXX
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-stone-200 px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-amber-600"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-stone-900">
              Enable WhatsApp updates
            </span>
            <span className="mt-0.5 block text-sm text-stone-500">
              Required client consent before sending project updates.
            </span>
          </span>
        </label>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-600">
          <p>
            Site report updates:{" "}
            <span className="font-medium text-stone-900">Manual</span>
          </p>
          <p className="mt-1">
            Quotation sharing:{" "}
            <span className="font-medium text-stone-900">Manual</span>
          </p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          onClick={() => void save()}
          disabled={pending || !isDirty}
          size="lg"
          icon={Save}
        >
          {pending ? "Saving..." : "Save communication settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
