"use client";

import { WhatsAppMessagePreview } from "@/components/communication/whatsapp-message-preview";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState } from "react";

type SendWhatsAppButtonProps = {
  projectId: string;
  label?: string;
  messageType:
    | "client_update"
    | "portal_link"
    | "daily_report"
    | "quotation"
    | "other";
  buildMessage: () => Promise<string> | string;
  toPhone: string | null;
  disabled?: boolean;
  requireActivePortal?: boolean;
  onSent?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
};

export function SendWhatsAppButton({
  projectId,
  label = "Send via WhatsApp",
  messageType,
  buildMessage,
  toPhone,
  disabled,
  requireActivePortal,
  onSent,
  size = "lg",
  variant = "primary",
}: SendWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [preparing, setPreparing] = useState(false);

  async function prepare() {
    if (disabled || preparing) {
      return;
    }

    setPreparing(true);
    try {
      const draft = await buildMessage();
      setMessage(draft);
      setOpen(true);
    } catch {
      // Caller surfaces toast for blocked states.
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => void prepare()}
        disabled={disabled || preparing}
        icon={Send}
      >
        {preparing ? "Preparing..." : label}
      </Button>
      <WhatsAppMessagePreview
        open={open}
        toPhone={toPhone}
        initialMessage={message}
        messageType={messageType}
        projectId={projectId}
        requireActivePortal={requireActivePortal}
        onClose={() => setOpen(false)}
        onSent={onSent}
      />
    </>
  );
}
