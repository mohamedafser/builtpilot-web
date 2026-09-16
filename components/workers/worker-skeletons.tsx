import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 6;

export function WorkerListSkeleton() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                </th>
                <th className="px-3 py-2 font-medium">Worker</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Daily wage</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Projects</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROW_COUNT }, (_, index) => (
                <tr key={index} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-36" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-8 w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-stone-100 bg-stone-50 px-3 py-2">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-stone-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-14" />
            </div>
          </div>
        ))}
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white px-3 py-2">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </>
  );
}

export function WorkerFormSkeleton() {
  return (
    <div className="max-w-3xl rounded-xl border border-stone-200 bg-white p-5">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export function WorkerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
