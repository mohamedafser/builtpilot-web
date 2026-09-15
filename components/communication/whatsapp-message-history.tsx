"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp/types";
import { formatPhoneDisplay, maskPhone } from "@/lib/whatsapp/validation";
import { formatTimestamp } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
};

const TYPE_LABEL: Record<string, string> = {
  client_update: "Client Update",
  portal_link: "Portal Link",
  daily_report: "Daily Report",
  quotation: "Quotation",
  other: "Other",
};

export function WhatsAppMessageHistory({
  messages,
}: {
  messages: WhatsAppMessageRecord[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Message History</CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-stone-500">
            No WhatsApp messages have been sent for this project yet.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {messages.map((message) => (
              <li key={message.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-stone-900">
                    {formatTimestamp(message.created_at)}
                  </p>
                  <p className="text-sm text-stone-600">
                    {STATUS_LABEL[message.status] ?? message.status}
                  </p>
                </div>
                <p className="mt-1 text-sm text-stone-700">
                  {TYPE_LABEL[message.message_type] ?? message.message_type}
                  {" · "}
                  {maskPhone(formatPhoneDisplay(message.recipient_phone))}
                </p>
                {message.sent_by_name ? (
                  <p className="mt-0.5 text-xs text-stone-500">
                    Sent by {message.sent_by_name}
                  </p>
                ) : null}
                {message.content ? (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-stone-600">
                    {message.content}
                  </p>
                ) : null}
                {message.status === "failed" && message.error_message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {message.error_message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
