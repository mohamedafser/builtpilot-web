import { MaterialListScreen } from "@/components/materials/material-list-screen";
import { MaterialListSkeleton } from "@/components/materials/material-skeletons";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Materials",
};

export default function MaterialsPage() {
  return (
    <Suspense fallback={<MaterialListSkeleton />}>
      <MaterialListScreen />
    </Suspense>
  );
}
