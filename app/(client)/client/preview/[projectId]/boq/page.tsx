import { ClientPortalBOQView } from "@/components/client-portal/client-portal-boq";
import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import { getPreviewClientPortalBOQ } from "@/lib/client-portal/queries";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PreviewBoqPage({ params }: PageProps) {
  const { projectId } = await params;
  const result = await getPreviewClientPortalBOQ(projectId);

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (result.error) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Work progress</h1>
      <ClientPortalBOQView boq={result.boq} />
    </div>
  );
}
