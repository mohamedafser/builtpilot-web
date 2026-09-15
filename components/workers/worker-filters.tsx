"use client";

import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  WORKER_STATUS_LABELS,
  WORKER_STATUSES,
} from "@/constants/worker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import type { WorkerProjectOption } from "@/lib/workers/types";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function WorkerFilters({
  projects,
}: {
  projects: WorkerProjectOption[];
}) {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const role = searchParams.get("role") ?? "";
  const project = searchParams.get("project") ?? "";
  const { value, setValue, applySearch, applyFilters } =
    useDebouncedSearchQuery();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:items-end"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="worker-search" className="sr-only">
          Search workers
        </label>
        <Input
          id="worker-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search by name or phone"
          className="h-12 text-base lg:h-10 lg:text-sm"
        />
      </div>
      <div className="w-full lg:w-44">
        <label htmlFor="worker-status" className="sr-only">
          Filter by status
        </label>
        <Select
          id="worker-status"
          value={status}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const nextStatus = event.target.value;
            applyFilters((params) => {
              if (nextStatus) {
                params.set("status", nextStatus);
              } else {
                params.delete("status");
              }
            });
          }}
        >
          <option value="">All statuses</option>
          {WORKER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {WORKER_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full lg:w-48">
        <label htmlFor="worker-role" className="sr-only">
          Filter by role
        </label>
        <Select
          id="worker-role"
          value={role}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const nextRole = event.target.value;
            applyFilters((params) => {
              if (nextRole) {
                params.set("role", nextRole);
              } else {
                params.delete("role");
              }
            });
          }}
        >
          <option value="">All roles</option>
          {WORKER_ROLES.map((value) => (
            <option key={value} value={value}>
              {WORKER_ROLE_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full lg:w-56">
        <label htmlFor="worker-project" className="sr-only">
          Filter by assigned project
        </label>
        <Select
          id="worker-project"
          value={project}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const nextProject = event.target.value;
            applyFilters((params) => {
              if (nextProject) {
                params.set("project", nextProject);
              } else {
                params.delete("project");
              }
            });
          }}
        >
          <option value="">All projects</option>
          <option value="unassigned">Unassigned</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>
    </form>
  );
}
