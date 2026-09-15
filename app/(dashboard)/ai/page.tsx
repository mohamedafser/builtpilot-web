import { AIChatScreen } from "@/components/ai/ai-chat-screen";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BuildPilot AI",
};

type AIPageProps = {
  searchParams: Promise<{ projectId?: string; prompt?: string }>;
};

export default async function AIPage({ searchParams }: AIPageProps) {
  const params = await searchParams;
  let projectName: string | undefined;

  if (params.projectId) {
    const result = await getProjectById(params.projectId);
    projectName = result.project?.name;
  }

  return (
    <AIChatScreen
      projectId={resultProjectId(params.projectId, projectName)}
      projectName={projectName}
      initialPrompt={params.prompt}
    />
  );
}

function resultProjectId(projectId: string | undefined, projectName?: string) {
  return projectName ? projectId : undefined;
}
