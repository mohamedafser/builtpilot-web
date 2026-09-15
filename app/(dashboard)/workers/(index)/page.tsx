import { WorkerListScreen } from "@/components/workers/worker-list-screen";
import { WorkerListSkeleton } from "@/components/workers/worker-skeletons";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Workers",
};

export default function WorkersPage() {
  return (
    <Suspense fallback={<WorkerListSkeleton />}>
      <WorkerListScreen />
    </Suspense>
  );
}
