import { Skeleton } from "@/components/ui/skeleton";

export function VendorListSkeleton() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <div className="p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="mb-3 h-8 w-full last:mb-0" />
          ))}
        </div>
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}

export function VendorFormSkeleton() {
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

export function VendorDetailSkeleton() {
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
