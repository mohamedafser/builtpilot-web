import { ProjectActions } from "@/components/projects/project-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatPendingCountLabel } from "@/lib/project-actions/helpers";
import type { ProjectWithPendingActions } from "@/lib/projects/queries";
import { formatCurrency, formatDate, formatTimestamp } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

function PendingActionsBadge({ count }: { count: number }) {
  if (count <= 0) {
    return <span className="text-stone-400">—</span>;
  }

  return (
    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-amber-900">
      {formatPendingCountLabel(count)}
    </span>
  );
}

function projectSubtitle(project: ProjectWithPendingActions) {
  return [project.client_name, project.location].filter(Boolean).join(" · ");
}

function ProjectMetaLine({ project }: { project: ProjectWithPendingActions }) {
  const budget =
    project.estimated_budget != null && project.estimated_budget !== ""
      ? formatCurrency(project.estimated_budget)
      : null;
  const parts = [project.client_name, project.location, budget].filter(Boolean);

  return (
    <p className="mt-0.5 truncate text-[12px] text-stone-500">
      {parts.length > 0 ? parts.join(" · ") : "No client details"}
    </p>
  );
}

export function ProjectList({
  projects,
  pagination,
}: {
  projects: ProjectWithPendingActions[];
  pagination: PaginationMeta;
}) {
  const pager = (
    <Pagination
      page={pagination.page}
      pageSize={pagination.pageSize}
      total={pagination.total}
      totalPages={pagination.totalPages}
    />
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-stone-200 bg-stone-50/80 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Budget</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Attention</th>
                <th className="px-3 py-2 font-medium">Schedule</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const subtitle = projectSubtitle(project);

                return (
                  <tr
                    key={project.id}
                    className={cn(
                      "border-t border-stone-100 align-middle transition-colors hover:bg-stone-50/70",
                      project.pending_action_count > 0 && "bg-amber-50/35",
                    )}
                  >
                    <td className="max-w-[16rem] px-3 py-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="block truncate font-medium text-stone-900 hover:text-amber-700"
                        title={project.name}
                      >
                        {project.name}
                      </Link>
                      {subtitle ? (
                        <p
                          className="mt-0.5 truncate text-[12px] text-stone-500"
                          title={subtitle}
                        >
                          {subtitle}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                      {formatCurrency(project.estimated_budget)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-3 py-2">
                      <PendingActionsBadge
                        count={project.pending_action_count}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-stone-600">
                      <span>{formatDate(project.start_date)}</span>
                      <span className="mx-1 text-stone-300">→</span>
                      <span>{formatDate(project.expected_end_date)}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-stone-500">
                      {formatTimestamp(project.updated_at)}
                    </td>
                    <td className="px-3 py-2">
                      <ProjectActions
                        projectId={project.id}
                        projectName={project.name}
                        archived={Boolean(project.archived_at)}
                        showView={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      <div className="space-y-2 md:hidden">
        {projects.map((project) => (
          <article
            key={project.id}
            className={cn(
              "rounded-lg border bg-white p-2.5",
              project.pending_action_count > 0
                ? "border-amber-200"
                : "border-stone-200",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="block truncate text-sm font-semibold text-stone-900 hover:text-amber-700"
                >
                  {project.name}
                </Link>
                <ProjectMetaLine project={project} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={project.status} />
                {project.pending_action_count > 0 ? (
                  <PendingActionsBadge count={project.pending_action_count} />
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-stone-100 pt-2 text-[11px] text-stone-500">
              <span>
                {formatDate(project.start_date)}
                <span className="mx-1 text-stone-300">→</span>
                {formatDate(project.expected_end_date)}
              </span>
              <span>{formatTimestamp(project.updated_at)}</span>
            </div>
            <div className="mt-2">
              <ProjectActions
                projectId={project.id}
                projectName={project.name}
                archived={Boolean(project.archived_at)}
                showView={false}
                layout="stack"
              />
            </div>
          </article>
        ))}
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
