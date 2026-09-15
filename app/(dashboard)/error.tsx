"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex justify-center px-1 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600">
            {error.message || "We could not load this page."}
          </p>
          <Button className="mt-5" onClick={reset} icon={RotateCcw}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
