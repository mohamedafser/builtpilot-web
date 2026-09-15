import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function BoqNotFound() {
  return (
    <EmptyState
      title="BOQ not found"
      description="This BOQ does not exist or you do not have access to it."
      action={
        <Link href="/projects" className={cn(linkButtonClassName("secondary"))}>
          Back to projects
        </Link>
      }
    />
  );
}
