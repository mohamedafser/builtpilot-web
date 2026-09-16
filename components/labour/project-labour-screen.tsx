"use client";

import { AssignWorkersDialog } from "@/components/labour/assign-workers-dialog";
import { LabourDashboardSkeleton } from "@/components/labour/labour-skeletons";
import { LabourSummaryCard } from "@/components/labour/labour-summary-card";
import {
  CompactPanel,
  CompactStatStrip,
  ProjectSectionHeader,
} from "@/components/projects/project-section-chrome";
import { HealthPill } from "@/components/projects/project-visuals";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkerStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { WORKER_ROLE_LABELS, ATTENDANCE_STATUS_LABELS } from "@/constants/worker";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useProject } from "@/hooks/use-project";
import { requestJson } from "@/lib/api/client";
import {
  apiCacheKey,
  getApiCacheGeneration,
  readApiCache,
  writeApiCache,
} from "@/lib/api/client-cache";
import { parsePagination } from "@/lib/api/pagination";
import {
  formatLabourCost,
  startOfMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import type {
  ProjectLabourAssignmentRow,
  ProjectLabourDashboard,
} from "@/lib/labour/types";
import { showToast } from "@/lib/toast";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ClipboardCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

function needsAttendance(row: ProjectLabourAssignmentRow) {
  return row.worker.status === "active" && row.today_attendance == null;
}

export function ProjectLabourScreen({ projectId }: { projectId: string }) {
  const { project, error: projectError, notFound, isLoading: projectLoading } =
    useProject(projectId);
  const searchParams = useSearchParams();
  const today = todayIsoDate();
  const from = searchParams.get("from") ?? startOfMonthIso(today);
  const to = searchParams.get("to") ?? today;
  const workersPagination = useMemo(
    () =>
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
    [searchParams],
  );
  const { isOpen, open, close } = useDisclosure();
  const dashboardUrl = useMemo(
    () =>
      `/api/projects/${projectId}/labour?date=${today}&from=${from}&to=${to}`,
    [from, projectId, to, today],
  );
  const dashboardCacheKey = apiCacheKey(dashboardUrl);
  const cachedDashboard =
    readApiCache<ProjectLabourDashboard>(dashboardCacheKey);
  const [dashboard, setDashboard] = useState<ProjectLabourDashboard | null>(
    cachedDashboard,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cachedDashboard);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (options?: { force?: boolean }) => {
    const existing = options?.force
      ? null
      : readApiCache<ProjectLabourDashboard>(dashboardCacheKey);

    if (existing) {
      setDashboard(existing);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestGeneration = getApiCacheGeneration();
    setIsLoading(true);
    setError(null);
    const result = await requestJson<ProjectLabourDashboard>(dashboardUrl);

    if (!result.ok) {
      setError(result.message);
      setDashboard(null);
      setIsLoading(false);
      return;
    }

    if (requestGeneration === getApiCacheGeneration()) {
      writeApiCache(dashboardCacheKey, result.data);
    }

    setDashboard(result.data);
    setIsLoading(false);
  }, [dashboardCacheKey, dashboardUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  function removeAssignment(assignmentId: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from this project? Historical attendance stays available.`,
      )
    ) {
      return;
    }

    setRemovingId(assignmentId);
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/labour/assignments/${assignmentId}`,
        { method: "POST" },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setRemovingId(null);
        return;
      }

      showToast(result.message, "success");
      setRemovingId(null);
      await load({ force: true });
    });
  }

  if (projectLoading || isLoading) {
    return <LabourDashboardSkeleton />;
  }

  if (notFound) {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link
            href="/projects"
            className={cn(linkButtonClassName("secondary"))}
          >
            <WithIcon icon={ArrowLeft}>Back to projects</WithIcon>
          </Link>
        }
      />
    );
  }

  if (projectError || error) {
    return <Alert variant="error">{projectError || error}</Alert>;
  }

  if (!project || !dashboard) {
    return null;
  }

  const { today: todayStats } = dashboard;
  const presenceSegments = [
    {
      key: "present",
      label: "Present",
      count: todayStats.present,
      className: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
    {
      key: "half",
      label: "Half day",
      count: todayStats.half_day,
      className: "bg-amber-400",
      textClass: "text-amber-800",
    },
    {
      key: "absent",
      label: "Absent",
      count: todayStats.absent,
      className: "bg-red-400",
      textClass: "text-red-700",
    },
    {
      key: "unmarked",
      label: "Unmarked",
      count: todayStats.unmarked,
      className: "bg-stone-300",
      textClass: "text-stone-600",
    },
  ];
  const presenceTotal = Math.max(
    todayStats.assigned_workers,
    presenceSegments.reduce((sum, segment) => sum + segment.count, 0),
    1,
  );
  const marked =
    todayStats.present + todayStats.half_day + todayStats.absent;
  const presenceTone =
    todayStats.assigned_workers === 0
      ? "neutral"
      : todayStats.unmarked > 0
        ? "warn"
        : "good";

  const assignedTotal = dashboard.assigned.length;
  const assignedTotalPages = Math.max(
    1,
    Math.ceil(assignedTotal / workersPagination.pageSize),
  );
  const assignedPage = Math.min(workersPagination.page, assignedTotalPages);
  const pagedAssigned = dashboard.assigned.slice(
    (assignedPage - 1) * workersPagination.pageSize,
    assignedPage * workersPagination.pageSize,
  );
  const workersPager = (
    <Pagination
      page={assignedPage}
      pageSize={workersPagination.pageSize}
      total={assignedTotal}
      totalPages={assignedTotalPages}
    />
  );

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Labour"
        description={`Attendance and wages for ${project.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={open} icon={UserPlus}>
              Assign
            </Button>
            <Link
              href={`/projects/${projectId}/labour/attendance`}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={ClipboardCheck}>Record attendance</WithIcon>
            </Link>
          </div>
        }
      />

      <CompactStatStrip
        stats={[
          {
            label: "Workers",
            value: String(todayStats.assigned_workers),
            hint: "Assigned today",
          },
          {
            label: "Today's cost",
            value: formatLabourCost(todayStats.labour_cost),
            tone: "accent",
          },
        ]}
      />

      <CompactPanel
        title="Today's presence"
        action={
          <HealthPill
            label={
              todayStats.assigned_workers === 0
                ? "No workers"
                : todayStats.unmarked > 0
                  ? `${todayStats.unmarked} unmarked`
                  : `${marked}/${todayStats.assigned_workers} marked`
            }
            tone={presenceTone}
          />
        }
      >
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-stone-100"
          role="img"
          aria-label={`Present ${todayStats.present}, half day ${todayStats.half_day}, absent ${todayStats.absent}, unmarked ${todayStats.unmarked}`}
        >
          {presenceSegments.map((segment) =>
            segment.count > 0 ? (
              <div
                key={segment.key}
                className={cn("h-full min-w-0", segment.className)}
                style={{
                  width: `${(segment.count / presenceTotal) * 100}%`,
                }}
                title={`${segment.label}: ${segment.count}`}
              />
            ) : null,
          )}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {presenceSegments.map((segment) => (
            <li
              key={segment.key}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs tabular-nums",
                segment.textClass,
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full", segment.className)}
                aria-hidden
              />
              <span className="font-medium">{segment.count}</span>
              <span className="text-stone-500">{segment.label}</span>
            </li>
          ))}
        </ul>
      </CompactPanel>

      <LabourSummaryCard summary={dashboard.summary} />

      <CompactPanel title="Assigned workers">
        {dashboard.assigned.length === 0 ? (
          <EmptyState
            title="No workers assigned to this project."
            description="Assign active workers from your business to start recording attendance."
            action={
              <Button size="sm" onClick={open} icon={UserPlus}>
                Assign worker
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-stone-200 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Worker</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Daily wage</th>
                      <th className="px-3 py-2 font-medium">Today</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAssigned.map((assignment) => {
                      const waiting = needsAttendance(assignment);

                      return (
                        <tr
                          key={assignment.assignment_id}
                          className={cn(
                            "border-t border-stone-100",
                            waiting && "bg-amber-50/40",
                          )}
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={`/workers/${assignment.worker.id}`}
                              className="font-medium text-stone-900 hover:text-amber-700"
                            >
                              {assignment.worker.name}
                            </Link>
                            {waiting ? (
                              <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                                Waiting for attendance
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-stone-600">
                            {WORKER_ROLE_LABELS[assignment.worker.role]}
                          </td>
                          <td className="px-3 py-2 text-stone-600 tabular-nums">
                            {formatLabourCost(assignment.worker.daily_wage)}
                          </td>
                          <td className="px-3 py-2 text-stone-600">
                            {assignment.today_attendance
                              ? ATTENDANCE_STATUS_LABELS[
                                  assignment.today_attendance.status
                                ]
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <WorkerStatusBadge
                              status={assignment.worker.status}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Link
                                href={`/projects/${projectId}/labour/attendance`}
                                className={cn(
                                  linkButtonClassName(
                                    waiting ? "primary" : "secondary",
                                    "sm",
                                  ),
                                )}
                              >
                                <WithIcon icon={ClipboardCheck}>
                                  Attendance
                                </WithIcon>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={
                                  isPending &&
                                  removingId === assignment.assignment_id
                                }
                                onClick={() =>
                                  removeAssignment(
                                    assignment.assignment_id,
                                    assignment.worker.name,
                                  )
                                }
                                icon={UserMinus}
                              >
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {workersPager}
            </div>

            <div className="space-y-2 md:hidden">
              {pagedAssigned.map((assignment) => {
                const waiting = needsAttendance(assignment);

                return (
                  <article
                    key={assignment.assignment_id}
                    className={cn(
                      "rounded-lg border p-3",
                      waiting
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-stone-200 bg-stone-50/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/workers/${assignment.worker.id}`}
                          className="text-sm font-semibold text-stone-900"
                        >
                          {assignment.worker.name}
                        </Link>
                        {waiting ? (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                            Waiting for attendance
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-stone-500">
                          {WORKER_ROLE_LABELS[assignment.worker.role]} ·{" "}
                          {formatLabourCost(assignment.worker.daily_wage)}/day
                        </p>
                      </div>
                      <WorkerStatusBadge status={assignment.worker.status} />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-stone-500">Today</dt>
                        <dd className="mt-0.5 font-medium text-stone-800">
                          {assignment.today_attendance
                            ? ATTENDANCE_STATUS_LABELS[
                                assignment.today_attendance.status
                              ]
                            : "Unmarked"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Wage</dt>
                        <dd className="mt-0.5 font-medium text-stone-800 tabular-nums">
                          {formatLabourCost(assignment.worker.daily_wage)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href={`/projects/${projectId}/labour/attendance`}
                        className={cn(
                          linkButtonClassName(
                            waiting ? "primary" : "secondary",
                            "sm",
                          ),
                          "justify-center",
                        )}
                      >
                        <WithIcon icon={ClipboardCheck}>Attendance</WithIcon>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={
                          isPending &&
                          removingId === assignment.assignment_id
                        }
                        onClick={() =>
                          removeAssignment(
                            assignment.assignment_id,
                            assignment.worker.name,
                          )
                        }
                        icon={UserMinus}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}
              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                {workersPager}
              </div>
            </div>
          </>
        )}
      </CompactPanel>

      <AssignWorkersDialog
        projectId={projectId}
        open={isOpen}
        onClose={close}
        onAssigned={() => {
          void load({ force: true });
        }}
      />
    </div>
  );
}
