import { Logo } from "@/components/layout/logo";
import { QuotationClientResponsePanel } from "@/components/quotations/quotation-client-response";
import { Alert } from "@/components/ui/alert";
import { getPublicQuotationByResponseToken } from "@/lib/quotations/public-response";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Respond to quotation" };
}

export default async function ClientQuotationResponsePage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const initialAction =
    query.action === "accept" || query.action === "reject"
      ? query.action
      : null;

  const result = await getPublicQuotationByResponseToken(token);

  if ("error" in result) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-6 py-16 text-center">
        <Logo href="#" />
        <h1 className="mt-8 max-w-md text-xl font-semibold text-stone-900">
          {result.error}
        </h1>
        <p className="mt-3 max-w-md text-sm text-stone-500">
          Ask your contractor to resend the quotation if you still need to
          respond.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex justify-center">
          <Logo href="#" />
        </div>
        {initialAction === "accept" && result.quotation.can_respond ? (
          <Alert>
            You opened an accept link from email. Review the quotation, then
            confirm accept below.
          </Alert>
        ) : null}
        <QuotationClientResponsePanel
          token={token}
          quotation={result.quotation}
          initialAction={initialAction}
        />
      </div>
    </div>
  );
}
