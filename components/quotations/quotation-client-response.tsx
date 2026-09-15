"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/client";
import { formatLabourCost } from "@/lib/labour/money";
import type { PublicQuotationResponseView } from "@/lib/quotations/public-response";
import { formatDateLong } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function QuotationClientResponsePanel({
  token,
  quotation,
  initialAction,
}: {
  token: string;
  quotation: PublicQuotationResponseView;
  initialAction?: "accept" | "reject" | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [mode, setMode] = useState<"choose" | "reject">(
    initialAction === "reject" ? "reject" : "choose",
  );
  const [done, setDone] = useState<"accepted" | "rejected" | null>(
    quotation.can_respond
      ? null
      : quotation.status === "accepted"
        ? "accepted"
        : quotation.status === "rejected"
          ? "rejected"
          : null,
  );

  function respond(action: "accept" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await requestJson<{
        status: "accepted" | "rejected";
      }>(`/api/client/quotation/${encodeURIComponent(token)}/respond`, {
        method: "POST",
        body: JSON.stringify({
          action,
          rejection_reason: action === "reject" ? rejectionReason : "",
        }),
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setDone(result.data.status);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          {done === "accepted" ? "Quotation accepted" : "Quotation rejected"}
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          {done === "accepted"
            ? "Thank you. Your contractor has been notified."
            : "Your response has been recorded. Your contractor has been notified."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
          {quotation.business_name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          Quotation {quotation.quotation_number}
        </h1>
        <p className="mt-1 text-base text-stone-700">{quotation.title}</p>
        <p className="mt-4 text-3xl font-semibold tabular-nums text-stone-900">
          {formatLabourCost(quotation.total_amount)}
        </p>
        <dl className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
          <div>
            <dt className="text-stone-400">Prepared for</dt>
            <dd className="font-medium text-stone-800">{quotation.client_name}</dd>
          </div>
          <div>
            <dt className="text-stone-400">Date</dt>
            <dd className="font-medium text-stone-800">
              {formatDateLong(quotation.quotation_date)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-400">Valid until</dt>
            <dd className="font-medium text-stone-800">
              {quotation.valid_until
                ? formatDateLong(quotation.valid_until)
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {quotation.message ? <Alert>{quotation.message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {quotation.can_respond ? (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          {mode === "reject" ? (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900">
                Reject quotation
              </h2>
              <p className="text-sm text-stone-600">
                Optionally tell the contractor why you are rejecting this quote.
              </p>
              <Textarea
                rows={4}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Reason (optional)"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setMode("choose")}
                >
                  Back
                </Button>
                <Button
                  variant="danger"
                  disabled={isPending}
                  onClick={() => respond("reject")}
                  icon={X}
                >
                  {isPending ? "Submitting..." : "Confirm reject"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-stone-900">
                Your response
              </h2>
              <p className="text-sm text-stone-600">
                Accept or reject this quotation. Your contractor will see the
                update in BuildPilot.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => respond("accept")}
                  icon={Check}
                >
                  {isPending && initialAction === "accept"
                    ? "Accepting..."
                    : "Accept quotation"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => setMode("reject")}
                  icon={X}
                >
                  Reject quotation
                </Button>
              </div>
              {initialAction === "accept" ? (
                <p className="text-xs text-stone-500">
                  You opened the accept link from your email. Confirm below to
                  continue.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
