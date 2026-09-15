import { ClientPortalSettingsForm } from "@/components/client-portal/client-portal-settings";
import { CommunicationCenter } from "@/components/communication/communication-center";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { linkButtonClassName } from "@/components/ui/button";
import { getContractorClientPortal } from "@/lib/client-portal/queries";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { getProjectCommunicationState } from "@/lib/whatsapp/queries";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Client portal" };
}

export default async function ProjectClientPortalPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getContractorClientPortal(id);
  const whatsappEnabled = isWhatsAppFeatureEnabled();
  const communication = whatsappEnabled
    ? await getProjectCommunicationState(id)
    : { state: null };

  if (result.error === "not_found") {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link href="/projects" className={cn(linkButtonClassName("secondary"))}>
            Back to projects
          </Link>
        }
      />
    );
  }

  if (!result.state) {
    return <Alert variant="error">{result.error}</Alert>;
  }

  return (
    <div className="space-y-6">
      <ClientPortalSettingsForm state={result.state} />
      {whatsappEnabled && communication.state ? (
        <CommunicationCenter
          projectId={communication.state.project_id}
          projectName={communication.state.project_name}
          access={communication.state.access}
          eligibility={communication.state.eligibility}
          recentMessages={communication.state.recent_messages}
        />
      ) : null}
    </div>
  );
}
