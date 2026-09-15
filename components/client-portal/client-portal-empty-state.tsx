import { EmptyState } from "@/components/ui/empty-state";

export function ClientPortalEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState title={title} description={description} className="py-12" />
  );
}
