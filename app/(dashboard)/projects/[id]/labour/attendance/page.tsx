import { AttendanceScreen } from "@/components/labour/attendance-screen";
import { AttendanceSheetSkeleton } from "@/components/labour/labour-skeletons";
import { getProjectById } from "@/lib/projects/queries";
import type { Metadata } from "next";
import { Suspense } from "react";

type AttendancePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AttendancePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProjectById(id);

  if (!result.project) {
    return { title: "Attendance" };
  }

  return { title: `Attendance · ${result.project.name}` };
}

export default async function ProjectAttendancePage({
  params,
}: AttendancePageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<AttendanceSheetSkeleton />}>
      <AttendanceScreen projectId={id} />
    </Suspense>
  );
}
