import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 6;

export function MaterialListSkeleton() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Price / unit</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROW_COUNT }, (_, index) => (
                <tr key={index} className="border-t border-stone-100">
                  <td className="px-3 py-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-4 w-16 rounded-full" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-8 w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-3.5 w-10" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-8 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-stone-100 bg-stone-50 px-3 py-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-stone-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-36" />
                <div className="mt-1 flex gap-1.5">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="flex items-center justify-between gap-2 bg-stone-50 px-3 py-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </>
  );
}

export function MaterialFormSkeleton() {
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

export function MaterialDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <Skeleton className="h-8 w-64" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function ProjectMaterialsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
