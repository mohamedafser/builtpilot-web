"use client";

import { MaterialDetail } from "@/components/materials/material-detail";
import { MaterialDetailSkeleton } from "@/components/materials/material-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMaterial } from "@/hooks/use-material";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function MaterialDetailScreen({ id }: { id: string }) {
  const { material, error, notFound, isLoading, reload } = useMaterial(id);

  if (isLoading) {
    return <MaterialDetailSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Material not found"
        description="This material does not exist or you do not have access to it."
        action={
          <Link
            href="/materials"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to materials
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!material) {
    return null;
  }

  return (
    <MaterialDetail material={material} onAssigned={() => void reload()} />
  );
}
