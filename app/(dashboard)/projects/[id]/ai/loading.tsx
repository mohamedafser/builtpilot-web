import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectAILoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-[28rem] w-full rounded-xl" />
    </div>
  );
}
