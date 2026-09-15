import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 6;

export function ProjectsPageSkeleton() {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
      <ProjectListSkeleton />
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-stone-200 bg-stone-50/80 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Budget</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Attention</th>
                <th className="px-3 py-2 font-medium">Schedule</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROW_COUNT }, (_, index) => (
                <tr key={index} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-1 h-3 w-28" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-7 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-stone-200 bg-white p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-100 pt-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
