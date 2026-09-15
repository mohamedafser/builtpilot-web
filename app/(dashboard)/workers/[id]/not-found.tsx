import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WorkerNotFound() {
  return (
    <EmptyState
      title="Worker not found"
      description="This worker does not exist or you do not have access to them."
      action={
        <Link href="/workers" className={cn(linkButtonClassName("secondary"))}>
          Back to workers
        </Link>
      }
    />
  );
}
