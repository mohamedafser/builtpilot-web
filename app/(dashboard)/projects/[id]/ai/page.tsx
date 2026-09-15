import { AIChatScreen } from "@/components/ai/ai-chat-screen";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type ProjectAIPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prompt?: string }>;
};

export async function generateMetadata({
  params,
}: ProjectAIPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  return {
    title: result.project
      ? `BuildPilot AI — ${result.project.name}`
      : "BuildPilot AI",
  };
}

export default async function ProjectAIPage({
  params,
  searchParams,
}: ProjectAIPageProps) {
  const { id } = await params;
  const { prompt } = await searchParams;
  const result = await getProjectById(id);

  if (!result.project) {
    notFound();
  }

  return (
    <AIChatScreen
      projectId={result.project.id}
      projectName={result.project.name}
      initialPrompt={prompt}
    />
  );
}
