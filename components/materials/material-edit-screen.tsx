"use client";

import { MaterialForm } from "@/components/materials/material-form";
import { MaterialFormSkeleton } from "@/components/materials/material-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useMaterial } from "@/hooks/use-material";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function EditMaterialScreen({ id }: { id: string }) {
  const { material, error, notFound, isLoading } = useMaterial(id);

  if (isLoading) {
    return <MaterialFormSkeleton />;
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
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit material</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update catalog details for {material.name}. Historical transactions
          stay unchanged.
        </p>
      </CardHeader>
      <CardContent>
        <MaterialForm material={material} />
      </CardContent>
    </Card>
  );
}
