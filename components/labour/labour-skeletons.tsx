import { Skeleton } from "@/components/ui/skeleton";

export function LabourDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AttendanceSheetSkeleton({
  listOnly = false,
}: {
  listOnly?: boolean;
}) {
  const list = (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton
          key={index}
          className="h-14 rounded-none border-b border-stone-100 last:border-0"
        />
      ))}
    </div>
  );

  if (listOnly) {
    return list;
  }

  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-lg" />
        ))}
      </div>
      {list}
    </div>
  );
}
