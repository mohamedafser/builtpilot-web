"use client";

import { Toaster } from "@/components/ui/toaster";
import { registerPwaServiceWorker } from "@/lib/pwa";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
