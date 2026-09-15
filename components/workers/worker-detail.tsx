"use client";

import { AssignWorkerToProjectsDialog } from "@/components/workers/assign-worker-to-projects-dialog";
import { WorkerActions } from "@/components/workers/worker-actions";
import { WorkerRoleBadge, WorkerStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useDisclosure } from "@/hooks/use-disclosure";
import { formatLabourCost } from "@/lib/labour/money";
import { formatDate } from "@/lib/utils";
import type { WorkerDetail } from "@/lib/workers/types";
import { UserPlus } from "lucide-react";
import Link from "next/link";

export function WorkerDetail({
  worker,
  onAssigned,
}: {
  worker: WorkerDetail;
  onAssigned?: () => void;
}) {
  const { isOpen, open, close } = useDisclosure();
  const activeAssignments = worker.assigned_projects.filter(
    (assignment) => assignment.status === "active",
  );
  const canAssign = worker.status === "active";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {worker.name}
              </h2>
              <WorkerRoleBadge role={worker.role} />
              <WorkerStatusBadge status={worker.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {worker.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Daily wage</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatLabourCost(worker.daily_wage)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Added</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatDate(worker.created_at.slice(0, 10))}
                </dd>
              </div>
            </dl>
          </div>
          <WorkerActions
            workerId={worker.id}
            workerName={worker.name}
            status={worker.status}
            showView={false}
            layout="stack"
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {worker.notes || "No notes added yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Assigned projects</CardTitle>
          {canAssign && activeAssignments.length > 0 ? (
            <Button onClick={open} className="h-12 sm:h-10" icon={UserPlus}>
              Assign to project
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <EmptyState
              title="No projects assigned yet."
              description={
                canAssign
                  ? "Assign this worker to a job so they can be marked for attendance."
                  : "Reactivate this worker before assigning them to a project."
              }
              action={
                canAssign ? (
                  <Button onClick={open} className="h-12 sm:h-10" icon={UserPlus}>
                    Assign to project
                  </Button>
                ) : null
              }
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {activeAssignments.map((assignment) => (
                <li
                  key={assignment.assignment_id}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/projects/${assignment.project_id}/labour`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {assignment.name}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    Assigned from {formatDate(assignment.assigned_from)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AssignWorkerToProjectsDialog
        workerId={worker.id}
        workerName={worker.name}
        open={isOpen}
        onClose={close}
        onAssigned={() => onAssigned?.()}
      />
    </div>
  );
}
