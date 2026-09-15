"use client";

import { AssignWorkersToProjectsDialog } from "@/components/workers/assign-workers-to-projects-dialog";
import { WorkerList } from "@/components/workers/worker-list";
import { WorkerListSkeleton } from "@/components/workers/worker-skeletons";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDisclosure } from "@/hooks/use-disclosure";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { requestJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { WorkerListItem } from "@/lib/workers/types";
import { FilterX, Plus, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WithIcon } from "@/components/ui/with-icon";

type WorkerListResponse = {
  workers: WorkerListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function WorkerListScreen() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const role = searchParams.get("role") ?? "";
  const project = searchParams.get("project") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const [result, setResult] = useState<WorkerListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedById, setSelectedById] = useState<Record<string, string>>({});
  const assignDialog = useDisclosure();

  useEffect(() => {
    setSelectedById({});
  }, [query, status, role, project]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();

    if (query) {
      params.set("q", query);
    }
    if (status) {
      params.set("status", status);
    }
    if (role) {
      params.set("role", role);
    }
    if (project) {
      params.set("project", project);
    }
    params.set("page", page);
    params.set("page_size", pageSize);

    async function load() {
      setIsLoading(true);
      setError(null);

      const response = await requestJson<WorkerListResponse>(
        `/api/workers?${params.toString()}`,
      );

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setError(response.message);
        setResult(null);
        setIsLoading(false);
        return;
      }

      setResult(response.data);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query, status, role, project, page, pageSize, reloadToken]);

  const workers = result?.workers ?? [];
  const selectedIds = useMemo(() => Object.keys(selectedById), [selectedById]);
  const selectedNames = useMemo(
    () => selectedIds.map((id) => selectedById[id]),
    [selectedById, selectedIds],
  );

  function toggleWorker(worker: WorkerListItem) {
    if (worker.status !== "active") {
      return;
    }

    setSelectedById((current) => {
      if (current[worker.id]) {
        const next = { ...current };
        delete next[worker.id];
        return next;
      }

      return { ...current, [worker.id]: worker.name };
    });
  }

  function toggleAllOnPage() {
    const assignable = workers.filter((worker) => worker.status === "active");
    const allSelected = assignable.every((worker) => selectedById[worker.id]);

    setSelectedById((current) => {
      const next = { ...current };

      if (allSelected) {
        for (const worker of assignable) {
          delete next[worker.id];
        }
      } else {
        for (const worker of assignable) {
          next[worker.id] = worker.name;
        }
      }

      return next;
    });
  }

  if (isLoading) {
    return <WorkerListSkeleton />;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  const total = result?.total ?? 0;
  const hasActiveFilters = Boolean(query || status || role || project);

  if (!total) {
    return (
      <EmptyState
        icon={Users}
        title={
          hasActiveFilters ? "No matching workers" : "No workers added yet."
        }
        description={
          hasActiveFilters
            ? "Try a different search, role, status, or assigned project filter."
            : "Add masons, helpers, and other site crew so they can be assigned to projects."
        }
        action={
          hasActiveFilters ? (
            <Link
              href="/workers"
              className={cn(linkButtonClassName("secondary"))}
            >
              <WithIcon icon={FilterX}>Clear filters</WithIcon>
            </Link>
          ) : (
            <Link href="/workers/new" className={cn(linkButtonClassName())}>
              <WithIcon icon={Plus}>Add worker</WithIcon>
            </Link>
          )
        }
      />
    );
  }

  return (
    <>
      {selectedIds.length > 0 ? (
        <div className="sticky top-0 z-20 mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-stone-800">
            {selectedIds.length === 1
              ? "1 worker selected"
              : `${selectedIds.length} workers selected`}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => setSelectedById({})}
              icon={X}
            >
              Clear
            </Button>
            <Button
              onClick={assignDialog.open}
              className="h-12 sm:h-10"
              icon={UserPlus}
            >
              Assign to project
            </Button>
          </div>
        </div>
      ) : null}

      <WorkerList
        workers={workers}
        pagination={{
          page: result?.page ?? 1,
          pageSize: result?.pageSize ?? DEFAULT_PAGE_SIZE,
          total,
          totalPages: result?.totalPages ?? 1,
        }}
        selectedIds={selectedIds}
        onToggleWorker={toggleWorker}
        onToggleAll={toggleAllOnPage}
      />

      <AssignWorkersToProjectsDialog
        workerIds={selectedIds}
        workerNames={selectedNames}
        open={assignDialog.isOpen}
        onClose={assignDialog.close}
        onAssigned={() => {
          setSelectedById({});
          setReloadToken((current) => current + 1);
        }}
      />
    </>
  );
}
