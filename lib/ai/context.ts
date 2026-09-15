import type {
  AIProjectOption,
  ClassifiedIntent,
  AIContextPayload,
  AISource,
} from "@/lib/ai/types";
import {
  getActiveProjectsTool,
  getBOQProgressTool,
  getBOQRemainingWorkTool,
  getEstimateVsActualTool,
  getExpenseSummaryTool,
  getLabourSummaryTool,
  getMaterialStockTool,
  getMaterialSummaryTool,
  getProjectCostTool,
  getProjectPhotosMetadataTool,
  getProjectSummaryTool,
  getQuotationSummaryTool,
  getRecentMeasurementsTool,
  getRecentSiteReportsTool,
  getSiteIssuesTool,
} from "@/lib/ai/tools";

const MAX_CONTEXT_CHARS = 14_000;

function pushSource(sources: AISource[], source: AISource) {
  if (!sources.some((item) => item.label === source.label)) {
    sources.push(source);
  }
}

export async function listAIProjectOptions(): Promise<AIProjectOption[]> {
  const { getProjects } = await import("@/lib/projects/queries");
  const { parsePagination } = await import("@/lib/api/pagination");
  const result = await getProjects({}, parsePagination({ page_size: "50" }));

  if (result.error) {
    return [];
  }

  return result.projects.map((project) => ({
    id: project.id,
    name: project.name,
    location: project.location,
    status: project.status,
  }));
}

export async function resolveProjectIdFromQuery(
  projectQuery: string,
): Promise<{ projectId: string; name: string } | { matches: string[] } | null> {
  const { getProjects } = await import("@/lib/projects/queries");
  const { parsePagination } = await import("@/lib/api/pagination");
  const result = await getProjects(
    { query: projectQuery },
    parsePagination({ page_size: "5" }),
  );

  if (result.error || result.projects.length === 0) {
    return null;
  }

  if (result.projects.length === 1) {
    return { projectId: result.projects[0].id, name: result.projects[0].name };
  }

  return { matches: result.projects.map((project) => project.name) };
}

export async function buildAIContext(input: {
  classified: ClassifiedIntent;
  projectId?: string;
}): Promise<AIContextPayload> {
  const { classified, projectId } = input;
  const context: AIContextPayload = {
    intent: classified.intent,
    period: classified.period,
    missing: [],
    sources: [],
  };

  const runProjectTools = Boolean(projectId);
  const { from, to } = classified.period;

  if (classified.intent === "PROJECT_LIST" || !runProjectTools) {
    if (classified.intent === "PROJECT_LIST" || classified.intent === "UNKNOWN") {
      const projects = await getActiveProjectsTool();
      if (projects.ok) {
        context.projects = projects.data;
        pushSource(context.sources, projects.source);
      } else if (projects.error === "missing_data") {
        context.missing.push(projects.message);
      }
    }

    if (!runProjectTools) {
      return trimContext(context);
    }
  }

  if (!projectId) {
    return trimContext(context);
  }

  const summary = await getProjectSummaryTool(projectId);
  if (summary.ok) {
    context.project = summary.data;
    pushSource(context.sources, summary.source);
  } else {
    context.missing.push(summary.message);
    return trimContext(context);
  }

  const intent = classified.intent;
  const needsSummaryBundle =
    intent === "PROJECT_SUMMARY" ||
    intent === "CLIENT_UPDATE" ||
    intent === "UNKNOWN";

  const tasks: Array<Promise<void>> = [];

  function captureMissing(message: string) {
    if (!context.missing.includes(message)) {
      context.missing.push(message);
    }
  }

  if (
    needsSummaryBundle ||
    intent === "BOQ_PROGRESS" ||
    intent === "BOQ_REMAINING"
  ) {
    tasks.push(
      (async () => {
        const boq = await getBOQProgressTool(projectId, classified.workQuery);
        if (boq.ok) {
          context.boq = boq.data;
          pushSource(context.sources, boq.source);
        } else {
          captureMissing(boq.message);
        }

        if (intent === "BOQ_REMAINING" || needsSummaryBundle) {
          const remaining = await getBOQRemainingWorkTool(
            projectId,
            classified.workQuery,
          );
          if (remaining.ok) {
            context.remaining_work = remaining.data;
            pushSource(context.sources, remaining.source);
          } else if (intent === "BOQ_REMAINING") {
            captureMissing(remaining.message);
          }
        }
      })(),
    );
  }

  if (
    needsSummaryBundle ||
    intent === "SITE_REPORT" ||
    intent === "SITE_ISSUES" ||
    intent === "DAILY_REPORT_GENERATION"
  ) {
    tasks.push(
      (async () => {
        if (intent === "SITE_ISSUES") {
          const issues = await getSiteIssuesTool(projectId, from, to);
          if (issues.ok) {
            context.site_reports = issues.data;
            pushSource(context.sources, issues.source);
          } else {
            captureMissing(issues.message);
          }
          return;
        }

        const reports = await getRecentSiteReportsTool(projectId, from, to);
        if (reports.ok) {
          context.site_reports = reports.data;
          pushSource(context.sources, reports.source);
        } else {
          captureMissing(reports.message);
        }
      })(),
    );
  }

  if (needsSummaryBundle || intent === "LABOUR_SUMMARY") {
    tasks.push(
      (async () => {
        const labour = await getLabourSummaryTool(projectId, from, to);
        if (labour.ok) {
          context.labour = labour.data;
          pushSource(context.sources, labour.source);
        } else {
          captureMissing(labour.message);
        }
      })(),
    );
  }

  if (needsSummaryBundle || intent === "MATERIAL_SUMMARY") {
    tasks.push(
      (async () => {
        const materials = await getMaterialSummaryTool(projectId, from, to);
        if (materials.ok) {
          context.materials = materials.data;
          pushSource(context.sources, materials.source);
        } else {
          captureMissing(materials.message);
        }
      })(),
    );
  }

  if (intent === "MATERIAL_STOCK") {
    tasks.push(
      (async () => {
        const stock = await getMaterialStockTool(projectId);
        if (stock.ok) {
          context.stock = stock.data;
          pushSource(context.sources, stock.source);
        } else {
          captureMissing(stock.message);
        }
      })(),
    );
  }

  if (needsSummaryBundle || intent === "EXPENSE_SUMMARY") {
    tasks.push(
      (async () => {
        const expenses = await getExpenseSummaryTool(projectId, from, to);
        if (expenses.ok) {
          context.expenses = expenses.data;
          pushSource(context.sources, expenses.source);
        } else {
          captureMissing(expenses.message);
        }
      })(),
    );
  }

  if (
    needsSummaryBundle ||
    intent === "PROJECT_COST" ||
    intent === "ESTIMATE_VS_ACTUAL"
  ) {
    tasks.push(
      (async () => {
        const cost = await getProjectCostTool(
          projectId,
          intent === "PROJECT_COST" && classified.period.label !== "current"
            ? from
            : undefined,
          intent === "PROJECT_COST" && classified.period.label !== "current"
            ? to
            : undefined,
        );
        if (cost.ok) {
          context.cost = cost.data;
          pushSource(context.sources, cost.source);
        } else {
          captureMissing(cost.message);
        }
      })(),
    );
  }

  if (intent === "QUOTATION" || intent === "ESTIMATE_VS_ACTUAL") {
    tasks.push(
      (async () => {
        const quotation = await getQuotationSummaryTool(projectId);
        if (quotation.ok) {
          context.quotation = quotation.data;
          pushSource(context.sources, quotation.source);
        } else if (intent === "QUOTATION") {
          captureMissing(quotation.message);
        }
      })(),
    );
  }

  if (intent === "ESTIMATE_VS_ACTUAL") {
    tasks.push(
      (async () => {
        const estimate = await getEstimateVsActualTool(projectId);
        if (estimate.ok) {
          context.estimate_vs_actual = estimate.data;
          pushSource(context.sources, estimate.source);
        } else {
          captureMissing(estimate.message);
        }
      })(),
    );
  }

  if (intent === "MEASUREMENTS") {
    tasks.push(
      (async () => {
        const measurements = await getRecentMeasurementsTool(
          projectId,
          classified.period.label === "current"
            ? from
            : from,
          classified.period.label === "current" ? to : to,
        );
        if (measurements.ok) {
          context.measurements = measurements.data;
          pushSource(context.sources, measurements.source);
        } else {
          captureMissing(measurements.message);
        }
      })(),
    );
  }

  if (intent === "SITE_REPORT" || intent === "PROJECT_SUMMARY") {
    tasks.push(
      (async () => {
        const photos = await getProjectPhotosMetadataTool(projectId);
        if (photos.ok) {
          context.photos = photos.data;
          pushSource(context.sources, photos.source);
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return trimContext(context);
}

function trimContext(context: AIContextPayload): AIContextPayload {
  const serialized = JSON.stringify(context);

  if (serialized.length <= MAX_CONTEXT_CHARS) {
    return context;
  }

  return {
    ...context,
    boq: context.boq
      ? { ...context.boq, items: context.boq.items.slice(0, 8) }
      : undefined,
    remaining_work: context.remaining_work?.slice(0, 8),
    site_reports: context.site_reports?.slice(0, 5),
    measurements: context.measurements?.slice(0, 8),
    photos: context.photos?.slice(0, 6),
    projects: context.projects?.slice(0, 12),
  };
}

export function contextHasGroundedData(context: AIContextPayload): boolean {
  return Boolean(
    context.project ||
      context.boq ||
      context.remaining_work?.length ||
      context.site_reports?.length ||
      context.labour ||
      context.materials ||
      context.stock ||
      context.expenses ||
      context.cost ||
      context.quotation ||
      context.estimate_vs_actual ||
      context.measurements?.length ||
      context.projects?.length,
  );
}
