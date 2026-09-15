"use client";

import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ImportDefaultMaterialsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onImport() {
    startTransition(async () => {
      const result = await requestJson<{ seeded: number }>(
        "/api/materials/seed-defaults",
        { method: "POST", notify: false },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }

      showToast(
        result.data.seeded > 0
          ? `Imported ${result.data.seeded} default materials.`
          : "All default materials are already in your catalog.",
        "success",
      );
      router.refresh();
      // Client list uses its own fetch — force a soft reload of the page data.
      window.location.assign("/materials");
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      icon={Download}
      disabled={isPending}
      onClick={onImport}
    >
      {isPending ? "Importing..." : "Import default materials"}
    </Button>
  );
}
