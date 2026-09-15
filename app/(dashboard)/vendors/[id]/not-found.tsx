import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VendorNotFound() {
  return (
    <EmptyState
      title="Vendor not found"
      description="This vendor does not exist or you do not have access to them."
      action={
        <Link href="/vendors" className={cn(linkButtonClassName("secondary"))}>
          Back to vendors
        </Link>
      }
    />
  );
}
