"use client";

import { AddProjectMaterialDialog } from "@/components/materials/add-project-material-dialog";
import { MaterialDateFilters } from "@/components/materials/material-date-filters";
import { ProjectMaterialsSkeleton } from "@/components/materials/material-skeletons";
import {
  MaterialTransactionDialog,
  type TransactionMode,
} from "@/components/materials/material-transaction-dialog";
import { MaterialTransactionList } from "@/components/materials/material-transaction-list";
import {
  CompactPanel,
  CompactStatStrip,
  ProjectSectionHeader,
} from "@/components/projects/project-section-chrome";
import { StockStatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  MATERIAL_TRANSACTION_TYPE_LABELS,
  MATERIAL_TRANSACTION_TYPES,
  MATERIAL_UNIT_SHORT_LABELS,
} from "@/constants/material";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useProject } from "@/hooks/use-project";
import { requestJson } from "@/lib/api/client";
import {
  apiCacheKey,
  getApiCacheGeneration,
  readApiCache,
  writeApiCache,
} from "@/lib/api/client-cache";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { startOfMonthIso, todayIsoDate } from "@/lib/labour/money";
import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type {
  MaterialTransactionListItem,
  ProjectMaterialRow,
  ProjectMaterialsDashboard,
} from "@/lib/materials/types";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  PackageMinus,
  PackagePlus,
  Plus,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type HistoryResponse = {
  transactions: MaterialTransactionListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function needsReceipt(row: {
  planned_quantity: string | null;
  total_received: string;
}) {
  const planned = Number(row.planned_quantity ?? 0);
  const received = Number(row.total_received ?? 0);
  if (planned > 0) {
    return received < planned;
  }
  return received <= 0;
}

function hasAdjustments(row: ProjectMaterialRow) {
  return (
    Number(row.total_adjusted_increase) > 0 ||
    Number(row.total_adjusted_decrease) > 0
  );
}

function formatAdjustedCell(row: ProjectMaterialRow) {
  const increase = Number(row.total_adjusted_increase);
  const decrease = Number(row.total_adjusted_decrease);
  if (increase <= 0 && decrease <= 0) {
    return "—";
  }

  const parts: string[] = [];
  if (increase > 0) {
    parts.push(
      `+${formatQuantityWithUnit(row.total_adjusted_increase, row.material.unit)}`,
    );
  }
  if (decrease > 0) {
    parts.push(
      `−${formatQuantityWithUnit(row.total_adjusted_decrease, row.material.unit)}`,
    );
  }
  return parts.join(" · ");
}

export function ProjectMaterialsScreen({ projectId }: { projectId: string }) {
  const {
    project,
    error: projectError,
    notFound,
    isLoading: projectLoading,
  } = useProject(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = todayIsoDate();
  const from = searchParams.get("from") ?? startOfMonthIso(today);
  const to = searchParams.get("to") ?? today;
  const addDialog = useDisclosure();
  const [mode, setMode] = useState<TransactionMode | null>(null);
  const [defaultMaterialId, setDefaultMaterialId] = useState<string>();
  const deepLinkConsumedRef = useRef(false);
  const dashboardUrl = useMemo(
    () => `/api/projects/${projectId}/materials?from=${from}&to=${to}`,
    [from, projectId, to],
  );
  const dashboardCacheKey = apiCacheKey(dashboardUrl);
  const cachedDashboard =
    readApiCache<ProjectMaterialsDashboard>(dashboardCacheKey);
  const [dashboard, setDashboard] = useState<ProjectMaterialsDashboard | null>(
    cachedDashboard,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cachedDashboard);
  const [updatingMaterialId, setUpdatingMaterialId] = useState<string | null>(
    null,
  );
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyType = searchParams.get("type") ?? "";
  const historyMaterial = searchParams.get("material") ?? "";
  const historyPage = searchParams.get("page") ?? "1";
  const deepLinkAction = searchParams.get("action");
  const deepLinkMaterial = searchParams.get("material") ?? "";
  const highlightId = searchParams.get("highlight") ?? "";

  const load = useCallback(
    async (options?: { force?: boolean; showSkeleton?: boolean }) => {
      const existing = options?.force
        ? null
        : readApiCache<ProjectMaterialsDashboard>(dashboardCacheKey);

      if (existing) {
        setDashboard(existing);
        setError(null);
        if (options?.showSkeleton !== false) {
          setIsLoading(false);
        }
        return;
      }

      const requestGeneration = getApiCacheGeneration();
      if (options?.showSkeleton !== false) {
        setIsLoading(true);
      }
      setError(null);
      const result = await requestJson<ProjectMaterialsDashboard>(dashboardUrl);
      if (!result.ok) {
        setError(result.message);
        if (options?.showSkeleton !== false) {
          setDashboard(null);
        }
        setIsLoading(false);
        return;
      }

      if (requestGeneration === getApiCacheGeneration()) {
        writeApiCache(dashboardCacheKey, result.data);
      }

      setDashboard(result.data);
      setIsLoading(false);
    },
    [dashboardCacheKey, dashboardUrl],
  );

  const loadHistory = useCallback(
    async (options?: { showLoader?: boolean }) => {
      const showLoader = options?.showLoader !== false;
      if (showLoader) {
        setHistoryLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("from", from);
        params.set("to", to);
        if (historyType) params.set("type", historyType);
        if (historyMaterial) params.set("material", historyMaterial);
        params.set("page", historyPage);
        params.set("page_size", String(DEFAULT_PAGE_SIZE));

        const result = await requestJson<HistoryResponse>(
          `/api/projects/${projectId}/materials/transactions?${params.toString()}`,
        );

        if (result.ok) {
          setHistory(result.data);
        }
      } finally {
        if (showLoader) {
          setHistoryLoading(false);
        }
      }
    },
    [from, historyMaterial, historyPage, historyType, projectId, to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const assignedMaterials = useMemo(
    () =>
      (dashboard?.assigned ?? [])
        .map((row) => row.material)
        .filter((material) => material.status === "active"),
    [dashboard],
  );

  const waitingReceiveMaterials = useMemo(
    () =>
      (dashboard?.assigned ?? [])
        .filter((row) => needsReceipt(row) && row.material.status === "active")
        .map((row) => row.material),
    [dashboard?.assigned],
  );

  const stockByMaterialId = useMemo(() => {
    const map: Record<string, { current: string; minimum: string | null }> = {};
    for (const row of dashboard?.assigned ?? []) {
      map[row.material.id] = {
        current: row.current_stock,
        minimum: row.effective_minimum_stock ?? row.minimum_stock,
      };
    }
    return map;
  }, [dashboard?.assigned]);

  const clearReceiveDeepLink = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (
      !params.has("action") &&
      !params.has("material") &&
      !params.has("highlight")
    ) {
      return;
    }

    params.delete("action");
    params.delete("material");
    params.delete("highlight");
    const query = params.toString();
    router.replace(
      query
        ? `/projects/${projectId}/materials?${query}`
        : `/projects/${projectId}/materials`,
      { scroll: false },
    );
  }, [projectId, router, searchParams]);

  const assignedRows = dashboard?.assigned;

  useEffect(() => {
    if (deepLinkAction !== "receive" || !assignedRows) {
      return;
    }

    if (deepLinkConsumedRef.current) {
      return;
    }

    deepLinkConsumedRef.current = true;

    const materialId =
      deepLinkMaterial ||
      assignedRows.find((row) => row.assignment_id === highlightId)?.material
        .id;

    if (materialId) {
      setDefaultMaterialId(materialId);
      setMode("receive");
    }

    if (highlightId) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`project-material-${highlightId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    clearReceiveDeepLink();
  }, [
    assignedRows,
    clearReceiveDeepLink,
    deepLinkAction,
    deepLinkMaterial,
    highlightId,
  ]);

  function openTxn(next: TransactionMode, materialId?: string) {
    setDefaultMaterialId(materialId);
    setMode(next);
  }

  function closeTxn() {
    setMode(null);
    setDefaultMaterialId(undefined);
    deepLinkConsumedRef.current = true;
    clearReceiveDeepLink();
  }

  if (projectLoading || isLoading) {
    return <ProjectMaterialsSkeleton />;
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
    return <Alert variant="error">{projectError ?? error}</Alert>;
  }

  if (!project || !dashboard) {
    return null;
  }

  const txnMaterials =
    mode === "receive" ? waitingReceiveMaterials : assignedMaterials;

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Materials"
        description={`Stock and purchases for ${project.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={addDialog.open} icon={Plus}>
              Add material
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openTxn("receive")}
              icon={PackagePlus}
            >
              Receive
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openTxn("use")}
              icon={PackageMinus}
            >
              Record usage
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openTxn("return")}
              icon={Undo2}
            >
              Return
            </Button>
          </div>
        }
      />

      <CompactStatStrip
        stats={[
          {
            label: "Material cost",
            value: formatMaterialCost(dashboard.totals.material_cost),
            tone: "accent",
          },
          {
            label: "In use",
            value: String(dashboard.totals.materials_in_use),
          },
          {
            label: "Low stock",
            value: String(dashboard.totals.low_stock),
            tone: dashboard.totals.low_stock > 0 ? "warn" : "default",
          },
          {
            label: "Out of stock",
            value: String(dashboard.totals.out_of_stock),
            tone: dashboard.totals.out_of_stock > 0 ? "bad" : "default",
          },
        ]}
      />

      <CompactPanel
        title="Cost summary"
        toolbar={<MaterialDateFilters compact />}
      >
        <p className="mb-2.5 text-[11px] text-stone-500">
          Purchases and usage in the selected range. Stock value uses average
          purchase price.
        </p>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-stone-50 px-2.5 py-2">
            <dt className="text-stone-500">Purchases</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {dashboard.cost.total_purchases}
            </dd>
          </div>
          <div className="rounded-lg bg-amber-50 px-2.5 py-2">
            <dt className="text-amber-800">Material cost</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatMaterialCost(dashboard.cost.total_material_cost)}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 px-2.5 py-2">
            <dt className="text-stone-500">Used amount</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatMaterialCost(dashboard.cost.total_used_cost)}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 px-2.5 py-2">
            <dt className="text-stone-500">Stock value</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatMaterialCost(dashboard.cost.stock_value)}
            </dd>
          </div>
        </dl>
        <div className="mt-3 grid gap-3 border-t border-stone-100 pt-3 sm:grid-cols-3">
          <SummaryList
            title="Most purchased"
            items={dashboard.cost.most_purchased.map(
              (item) => `${item.name} · ${item.quantity}`,
            )}
          />
          <SummaryList
            title="Highest cost"
            items={dashboard.cost.highest_cost.map(
              (item) => `${item.name} · ${formatMaterialCost(item.total_cost)}`,
            )}
          />
          <SummaryList
            title="Vendor totals"
            items={dashboard.cost.vendor_totals.map(
              (item) => `${item.name} · ${formatMaterialCost(item.total_cost)}`,
            )}
          />
        </div>
      </CompactPanel>

      {dashboard.assigned.length === 0 ? (
        <EmptyState
          title="No materials on this project yet."
          description="Add a catalog material, then receive stock from a vendor."
          action={
            <Button size="sm" onClick={addDialog.open} icon={Plus}>
              Add material
            </Button>
          }
        />
      ) : (
        <CompactPanel title="Project materials">
          <div className="hidden overflow-hidden rounded-lg border border-stone-200 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Stock</th>
                    <th className="px-3 py-2 font-medium">Received</th>
                    <th className="px-3 py-2 font-medium">Used</th>
                    <th className="px-3 py-2 font-medium">Adjusted</th>
                    <th className="px-3 py-2 font-medium">Latest price</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.assigned.map((row) => {
                    const waiting = needsReceipt(row);
                    const adjusted = hasAdjustments(row);
                    const highlighted =
                      highlightId === row.assignment_id ||
                      deepLinkMaterial === row.material.id;
                    const isUpdating = row.material.id === updatingMaterialId;
                    const lastIncrease =
                      row.last_adjustment?.direction === "increase";
                    const lastDecrease =
                      row.last_adjustment?.direction === "decrease";

                    if (isUpdating) {
                      return (
                        <tr
                          key={row.assignment_id}
                          id={`project-material-${row.assignment_id}`}
                          className="border-t border-stone-100 bg-stone-50/80"
                        >
                          <td className="px-3 py-3" colSpan={10}>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-stone-300" />
                              Updating material details…
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={row.assignment_id}
                        id={`project-material-${row.assignment_id}`}
                        className={cn(
                          "border-t border-stone-100",
                          highlighted &&
                            "bg-amber-50 ring-1 ring-amber-200 ring-inset",
                          waiting && !highlighted && "bg-amber-50/40",
                          !waiting &&
                            !highlighted &&
                            lastIncrease &&
                            "bg-emerald-50/35",
                          !waiting &&
                            !highlighted &&
                            lastDecrease &&
                            "bg-rose-50/35",
                        )}
                      >
                        <td className="px-3 py-2">
                          <Link
                            href={`/materials/${row.material.id}`}
                            className="font-medium text-stone-900 hover:text-amber-700"
                          >
                            {row.material.name}
                          </Link>
                          {waiting ? (
                            <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                              Waiting for receipt
                            </p>
                          ) : null}
                          {row.last_adjustment ? (
                            <p
                              className={cn(
                                "mt-0.5 text-[11px] font-medium",
                                row.last_adjustment.direction === "increase"
                                  ? "text-emerald-800"
                                  : "text-rose-800",
                              )}
                            >
                              Stock{" "}
                              {row.last_adjustment.direction === "increase"
                                ? "increased"
                                : "decreased"}{" "}
                              by{" "}
                              {formatQuantityWithUnit(
                                row.last_adjustment.quantity,
                                row.material.unit,
                              )}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-stone-600">
                          {row.vendor_name || "—"}
                        </td>
                        <td className="px-3 py-2 text-stone-600">
                          {MATERIAL_UNIT_SHORT_LABELS[row.material.unit]}
                        </td>
                        <td className="px-3 py-2 text-stone-700 tabular-nums">
                          {formatQuantityWithUnit(
                            row.current_stock,
                            row.material.unit,
                          )}
                        </td>
                        <td className="px-3 py-2 text-stone-600 tabular-nums">
                          {formatQuantityWithUnit(
                            row.total_received,
                            row.material.unit,
                          )}
                        </td>
                        <td className="px-3 py-2 text-stone-600 tabular-nums">
                          {formatQuantityWithUnit(
                            row.total_used,
                            row.material.unit,
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 tabular-nums",
                            adjusted ? "font-medium text-stone-800" : "text-stone-400",
                          )}
                        >
                          {formatAdjustedCell(row)}
                        </td>
                        <td className="px-3 py-2 text-stone-600 tabular-nums">
                          {formatMaterialCost(row.latest_unit_price)}
                        </td>
                        <td className="px-3 py-2">
                          <StockStatusBadge status={row.stock_status} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant={waiting ? "primary" : "secondary"}
                              onClick={() =>
                                openTxn("receive", row.material.id)
                              }
                              icon={PackagePlus}
                            >
                              Receive
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openTxn("use", row.material.id)}
                              icon={PackageMinus}
                            >
                              Use
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {dashboard.assigned.map((row) => {
              const waiting = needsReceipt(row);
              const adjusted = hasAdjustments(row);
              const highlighted =
                highlightId === row.assignment_id ||
                deepLinkMaterial === row.material.id;
              const isUpdating = row.material.id === updatingMaterialId;
              const lastIncrease =
                row.last_adjustment?.direction === "increase";
              const lastDecrease =
                row.last_adjustment?.direction === "decrease";

              if (isUpdating) {
                return (
                  <article
                    key={row.assignment_id}
                    id={`project-material-${row.assignment_id}`}
                    className="rounded-lg border border-stone-200 bg-stone-50/80 p-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-stone-300" />
                      Updating material details…
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={row.assignment_id}
                  id={`project-material-${row.assignment_id}`}
                  className={cn(
                    "rounded-lg border p-3",
                    highlighted || waiting
                      ? "border-amber-200 bg-amber-50/60"
                      : lastIncrease
                        ? "border-emerald-200 bg-emerald-50/50"
                        : lastDecrease
                          ? "border-rose-200 bg-rose-50/50"
                          : "border-stone-200 bg-stone-50/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/materials/${row.material.id}`}
                        className="text-sm font-semibold text-stone-900"
                      >
                        {row.material.name}
                      </Link>
                      {waiting ? (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                          Waiting for receipt
                        </p>
                      ) : null}
                      {row.last_adjustment ? (
                        <p
                          className={cn(
                            "mt-0.5 text-[11px] font-medium",
                            row.last_adjustment.direction === "increase"
                              ? "text-emerald-800"
                              : "text-rose-800",
                          )}
                        >
                          Stock{" "}
                          {row.last_adjustment.direction === "increase"
                            ? "increased"
                            : "decreased"}{" "}
                          by{" "}
                          {formatQuantityWithUnit(
                            row.last_adjustment.quantity,
                            row.material.unit,
                          )}
                        </p>
                      ) : null}
                    </div>
                    <StockStatusBadge status={row.stock_status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-stone-500">Vendor</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {row.vendor_name || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Stock</dt>
                      <dd className="mt-0.5 font-medium text-stone-800 tabular-nums">
                        {formatQuantityWithUnit(
                          row.current_stock,
                          row.material.unit,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Used</dt>
                      <dd className="mt-0.5 font-medium text-stone-800 tabular-nums">
                        {formatQuantityWithUnit(
                          row.total_used,
                          row.material.unit,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Adjusted</dt>
                      <dd
                        className={cn(
                          "mt-0.5 font-medium tabular-nums",
                          adjusted ? "text-stone-800" : "text-stone-400",
                        )}
                      >
                        {formatAdjustedCell(row)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={waiting ? "primary" : "secondary"}
                      onClick={() => openTxn("receive", row.material.id)}
                      icon={PackagePlus}
                    >
                      Receive
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openTxn("use", row.material.id)}
                      icon={PackageMinus}
                    >
                      Use
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </CompactPanel>
      )}

      <CompactPanel
        title="Transaction history"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openTxn("adjust")}
            icon={SlidersHorizontal}
          >
            Adjust stock
          </Button>
        }
        toolbar={
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
            <div className="min-w-0">
              <label
                htmlFor="history-material"
                className="mb-1 block text-[11px] font-medium text-stone-500"
              >
                Material
              </label>
              <Select
                id="history-material"
                className="h-9"
                value={historyMaterial}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("page");
                  if (event.target.value) {
                    params.set("material", event.target.value);
                  } else {
                    params.delete("material");
                  }
                  const query = params.toString();
                  router.replace(
                    query
                      ? `/projects/${projectId}/materials?${query}`
                      : `/projects/${projectId}/materials`,
                  );
                }}
              >
                <option value="">All materials</option>
                {(dashboard?.assigned ?? []).map((row) => (
                  <option key={row.material.id} value={row.material.id}>
                    {row.material.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0">
              <label
                htmlFor="history-type"
                className="mb-1 block text-[11px] font-medium text-stone-500"
              >
                Type
              </label>
              <Select
                id="history-type"
                className="h-9"
                value={historyType}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("page");
                  if (event.target.value) {
                    params.set("type", event.target.value);
                  } else {
                    params.delete("type");
                  }
                  const query = params.toString();
                  router.replace(
                    query
                      ? `/projects/${projectId}/materials?${query}`
                      : `/projects/${projectId}/materials`,
                  );
                }}
              >
                <option value="">All types</option>
                {MATERIAL_TRANSACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MATERIAL_TRANSACTION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      >
        {historyLoading ? (
          <div
            className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500"
            role="status"
            aria-live="polite"
          >
            <Spinner className="h-4 w-4 text-stone-400" />
            Loading history…
          </div>
        ) : (
          <>
            <MaterialTransactionList
              transactions={
                history?.transactions ?? dashboard.recent_transactions
              }
              emptyTitle="No transactions in this range."
              emptyDescription="Receive material to start a project stock history."
              showMaterial
            />
            {history && history.totalPages > 1 ? (
              <Pagination
                page={history.page}
                pageSize={history.pageSize}
                total={history.total}
                totalPages={history.totalPages}
              />
            ) : null}
          </>
        )}
      </CompactPanel>

      <AddProjectMaterialDialog
        projectId={projectId}
        open={addDialog.isOpen}
        onClose={addDialog.close}
        onAdded={() => void load({ force: true, showSkeleton: false })}
      />
      {mode ? (
        <MaterialTransactionDialog
          projectId={projectId}
          mode={mode}
          materials={txnMaterials}
          defaultMaterialId={defaultMaterialId}
          stockByMaterialId={stockByMaterialId}
          materialsLoading={false}
          open
          onClose={closeTxn}
          onSaved={() => {
            const materialId = defaultMaterialId;
            setUpdatingMaterialId(materialId ?? null);
            closeTxn();
            void Promise.all([
              load({ force: true, showSkeleton: false }),
              loadHistory({ showLoader: true }),
            ]).finally(() => {
              setUpdatingMaterialId(null);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-1.5 text-xs text-stone-500">None in this range.</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-xs text-stone-800">
          {items.map((item) => (
            <li key={item} className="truncate">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
