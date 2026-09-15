"use client";

import { AttendanceSheetSkeleton } from "@/components/labour/labour-skeletons";
import {
  CompactStatStrip,
  ProjectSectionHeader,
} from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { WithIcon } from "@/components/ui/with-icon";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUSES,
  WORKER_ROLE_LABELS,
} from "@/constants/worker";
import { useProject } from "@/hooks/use-project";
import { requestJson } from "@/lib/api/client";
import {
  addPaise,
  calculateAttendanceWage,
  dayRateFromAttendance,
  defaultHoursForStatus,
  formatLabourCost,
  formatPaise,
  todayIsoDate,
} from "@/lib/labour/money";
import type { AttendanceSheetRow } from "@/lib/labour/types";
import { showToast } from "@/lib/toast";
import { cn, getInitials } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import {
  ArrowLeft,
  CheckCheck,
  ClipboardCheck,
  Save,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type DraftEntry = {
  status: AttendanceStatus | "";
  hours_worked: string;
};

const STATUS_SHORT: Record<AttendanceStatus, string> = {
  present: "P",
  half_day: "H",
  absent: "A",
};

function statusTone(active: boolean, status: AttendanceStatus) {
  if (!active) {
    return "bg-transparent text-stone-600 hover:bg-stone-100";
  }

  if (status === "present") {
    return "bg-emerald-600 text-white shadow-sm";
  }

  if (status === "half_day") {
    return "bg-amber-500 text-white shadow-sm";
  }

  return "bg-red-600 text-white shadow-sm";
}

export function AttendanceScreen({ projectId }: { projectId: string }) {
  const { error: projectError, notFound, isLoading: projectLoading } =
    useProject(projectId);
  const searchParams = useSearchParams();
  const [date, setDate] = useState(
    searchParams.get("date") || todayIsoDate(),
  );
  const [rows, setRows] = useState<AttendanceSheetRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(
    async (attendanceDate: string) => {
      setIsLoading(true);
      setError(null);
      const result = await requestJson<{
        date: string;
        rows: AttendanceSheetRow[];
      }>(`/api/projects/${projectId}/labour/attendance?date=${attendanceDate}`);

      if (!result.ok) {
        setError(result.message);
        setRows([]);
        setDrafts({});
        setIsLoading(false);
        return;
      }

      const nextDrafts: Record<string, DraftEntry> = {};
      for (const row of result.data.rows) {
        nextDrafts[row.worker.id] = {
          status: row.attendance?.status ?? "",
          hours_worked:
            row.attendance?.hours_worked == null
              ? ""
              : String(row.attendance.hours_worked),
        };
      }

      setRows(result.data.rows);
      setDrafts(nextDrafts);
      setIsLoading(false);
    },
    [projectId],
  );

  useEffect(() => {
    void load(date);
  }, [date, load]);

  function setStatus(workerId: string, status: AttendanceStatus) {
    setDrafts((current) => {
      const existing = current[workerId];
      const hours =
        existing?.hours_worked && existing.hours_worked !== ""
          ? existing.hours_worked
          : defaultHoursForStatus(status);

      return {
        ...current,
        [workerId]: {
          status,
          hours_worked: hours,
        },
      };
    });
  }

  function markAllPresent() {
    setDrafts((current) => {
      const next: Record<string, DraftEntry> = { ...current };
      for (const row of rows) {
        const existing = next[row.worker.id];
        next[row.worker.id] = {
          status: "present",
          hours_worked:
            existing?.hours_worked && existing.hours_worked !== ""
              ? existing.hours_worked
              : defaultHoursForStatus("present"),
        };
      }
      return next;
    });
  }

  const markedCount = useMemo(
    () => Object.values(drafts).filter((entry) => entry.status !== "").length,
    [drafts],
  );

  const statusCounts = useMemo(() => {
    const counts = { present: 0, half_day: 0, absent: 0 };
    for (const entry of Object.values(drafts)) {
      if (entry.status) counts[entry.status] += 1;
    }
    return counts;
  }, [drafts]);

  const previewCost = useMemo(() => {
    const wages = rows.flatMap((row) => {
      const draft = drafts[row.worker.id];
      if (!draft?.status) {
        return [];
      }

      const dayRate = row.attendance
        ? dayRateFromAttendance(
            row.attendance.status,
            row.attendance.wage,
            row.worker.daily_wage,
          )
        : row.worker.daily_wage;

      return [calculateAttendanceWage(dayRate, draft.status)];
    });

    return formatPaise(addPaise(wages));
  }, [drafts, rows]);

  const progress =
    rows.length === 0 ? 0 : Math.round((markedCount / rows.length) * 100);

  function save() {
    const entries = rows.flatMap((row) => {
      const draft = drafts[row.worker.id];
      if (!draft?.status) {
        return [];
      }

      return [
        {
          worker_id: row.worker.id,
          status: draft.status,
          hours_worked: String(draft.hours_worked ?? ""),
        },
      ];
    });

    if (entries.length === 0) {
      showToast("Mark attendance for at least one worker.", "error");
      return;
    }

    startTransition(async () => {
      const result = await requestJson<{ ok: true }>(
        `/api/projects/${projectId}/labour/attendance`,
        {
          method: "PUT",
          body: JSON.stringify({
            attendance_date: date,
            entries,
          }),
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      await load(date);
    });
  }

  if (projectLoading) {
    return <AttendanceSheetSkeleton />;
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

  if (projectError) {
    return <Alert variant="error">{projectError}</Alert>;
  }

  return (
    <div className="space-y-3 pb-24 sm:pb-0">
      <ProjectSectionHeader
        title="Record attendance"
        description="Mark who is on site and save wages for the day"
        action={
          <Link
            href={`/projects/${projectId}/labour`}
            className={cn(linkButtonClassName("secondary", "sm"))}
          >
            <WithIcon icon={ArrowLeft}>Labour</WithIcon>
          </Link>
        }
      />

      <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-full min-w-[9.5rem] sm:w-40">
              <label
                htmlFor="attendance-date"
                className="mb-1 block text-[11px] font-medium text-stone-500"
              >
                Date
              </label>
              <Input
                id="attendance-date"
                type="date"
                value={date}
                className="h-9 text-sm"
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={markAllPresent}
              disabled={rows.length === 0 || isLoading}
              icon={CheckCheck}
            >
              Mark all present
            </Button>
          </div>
          <Button
            size="sm"
            className="hidden sm:inline-flex"
            onClick={save}
            disabled={isPending || markedCount === 0}
            icon={Save}
          >
            {isPending ? "Saving..." : `Save · ${formatLabourCost(previewCost)}`}
          </Button>
        </div>

        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
              {markedCount} of {rows.length} marked
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {!isLoading && rows.length > 0 ? (
        <CompactStatStrip
          stats={[
            {
              label: "Present",
              value: String(statusCounts.present),
              tone: "good",
            },
            {
              label: "Half day",
              value: String(statusCounts.half_day),
              tone: "warn",
            },
            {
              label: "Absent",
              value: String(statusCounts.absent),
              tone: "bad",
            },
            {
              label: "Day cost",
              value: formatLabourCost(previewCost),
              tone: "accent",
            },
          ]}
        />
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {isLoading ? (
        <AttendanceSheetSkeleton listOnly />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No workers assigned to this project."
          description="Assign workers before recording attendance."
          action={
            <Link
              href={`/projects/${projectId}/labour`}
              className={cn(linkButtonClassName())}
            >
              <WithIcon icon={Users}>Manage labour</WithIcon>
            </Link>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {markedCount === 0 && rows.every((row) => !row.attendance) ? (
            <p className="border-b border-stone-100 bg-stone-50/80 px-3 py-2 text-[11px] text-stone-500">
              No attendance recorded for this date yet — tap a status to start.
            </p>
          ) : null}
          <ul className="divide-y divide-stone-100">
            {rows.map((row) => (
              <AttendanceRow
                key={row.worker.id}
                row={row}
                draft={drafts[row.worker.id]}
                onStatusChange={setStatus}
                onHoursChange={(hours) =>
                  setDrafts((current) => ({
                    ...current,
                    [row.worker.id]: {
                      status: current[row.worker.id]?.status ?? "",
                      hours_worked: hours,
                    },
                  }))
                }
              />
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-stone-500">
              {markedCount}/{rows.length} marked
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-stone-900">
              {formatLabourCost(previewCost)}
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={save}
            disabled={isPending || markedCount === 0}
            icon={Save}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttendanceRow({
  row,
  draft,
  onStatusChange,
  onHoursChange,
}: {
  row: AttendanceSheetRow;
  draft?: DraftEntry;
  onStatusChange: (workerId: string, status: AttendanceStatus) => void;
  onHoursChange: (hours: string) => void;
}) {
  const status = draft?.status || "";
  const dayRate = row.attendance
    ? dayRateFromAttendance(
        row.attendance.status,
        row.attendance.wage,
        row.worker.daily_wage,
      )
    : row.worker.daily_wage;
  const wage =
    status === "" ? null : calculateAttendanceWage(dayRate, status);

  return (
    <li className="px-3 py-2.5 sm:px-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold text-white"
            aria-hidden
          >
            {getInitials(row.worker.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-stone-900">
                {row.worker.name}
              </p>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-stone-800 sm:hidden">
                {wage ? formatLabourCost(wage) : "—"}
              </p>
            </div>
            <p className="truncate text-[11px] text-stone-500">
              {WORKER_ROLE_LABELS[row.worker.role]} ·{" "}
              {formatLabourCost(row.worker.daily_wage)}/day
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-3 rounded-lg bg-stone-100 p-0.5 sm:w-52 sm:shrink-0"
          role="group"
          aria-label={`Attendance for ${row.worker.name}`}
        >
          {ATTENDANCE_STATUSES.map((value) => {
            const active = status === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onStatusChange(row.worker.id, value)}
                className={cn(
                  "inline-flex h-8 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                  statusTone(active, value),
                )}
                aria-pressed={active}
                title={ATTENDANCE_STATUS_LABELS[value]}
              >
                <span className="sm:hidden">{STATUS_SHORT[value]}</span>
                <span className="hidden sm:inline">
                  {ATTENDANCE_STATUS_LABELS[value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:w-auto sm:shrink-0">
          <label className="flex min-w-0 flex-1 items-center gap-1.5 sm:w-24 sm:flex-none">
            <span className="sr-only">Hours for {row.worker.name}</span>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              inputMode="decimal"
              placeholder="Hrs"
              className="h-8 text-sm"
              value={draft?.hours_worked ?? ""}
              onChange={(event) => onHoursChange(event.target.value)}
            />
          </label>
          <p className="hidden w-[4.75rem] shrink-0 text-right text-xs font-semibold tabular-nums text-stone-800 sm:block">
            {wage ? formatLabourCost(wage) : "—"}
          </p>
        </div>
      </div>
    </li>
  );
}
