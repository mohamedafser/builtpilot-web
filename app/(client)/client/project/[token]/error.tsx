"use client";

import { ClientPortalError } from "@/components/client-portal/client-portal-error";

export default function ClientPortalRouteError() {
  return (
    <ClientPortalError message="Unable to load this project. Please contact your contractor." />
  );
}
