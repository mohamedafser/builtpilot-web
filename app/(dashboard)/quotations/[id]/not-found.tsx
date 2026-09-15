import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function QuotationNotFound() {
  return (
    <EmptyState
      title="Quotation not found"
      description="This quotation does not exist or you do not have access to it."
      action={
        <Link
          href="/quotations"
          className={cn(linkButtonClassName("secondary"))}
        >
          Back to quotations
        </Link>
      }
    />
  );
}
