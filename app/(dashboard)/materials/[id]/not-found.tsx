import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function MaterialNotFound() {
  return (
    <EmptyState
      title="Material not found"
      description="This material does not exist or you do not have access to it."
      action={
        <Link
          href="/materials"
          className={cn(linkButtonClassName("secondary"))}
        >
          Back to materials
        </Link>
      }
    />
  );
}
