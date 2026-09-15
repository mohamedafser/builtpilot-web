import type { AIIntentName } from "@/constants/ai";
import type { AIConversation, AIMessage, AIUsage } from "@/types";

export type AIIntent = AIIntentName;

export type AIPeriod = {
  from: string;
  to: string;
  label: string;
};

export type ClassifiedIntent = {
  intent: AIIntent;
  period: AIPeriod;
  workQuery?: string;
  projectQuery?: string;
  needsProject: boolean;
  isGlobal: boolean;
  isFollowUp: boolean;
};

export type AIProjectOption = {
  id: string;
  name: string;
  location: string | null;
  status: string;
};

export type AISource = {
  label: string;
  count?: number;
};

export type AIToolName =
  | "getProjectSummary"
  | "getBOQProgress"
  | "getBOQRemainingWork"
  | "getRecentSiteReports"
  | "getSiteIssues"
  | "getLabourSummary"
  | "getMaterialSummary"
  | "getMaterialStock"
  | "getExpenseSummary"
  | "getProjectCost"
  | "getQuotationSummary"
  | "getEstimateVsActual"
  | "getRecentMeasurements"
  | "getActiveProjects"
  | "getProjectPhotosMetadata";

export type AIToolErrorCode =
  | "unauthorized"
  | "not_found"
  | "missing_data"
  | "failed";

export type AIToolResult<T> = {
  ok: true;
  tool: AIToolName;
  data: T;
  source: AISource;
  missing?: string;
} | {
  ok: false;
  tool: AIToolName;
  error: AIToolErrorCode;
  message: string;
};

export type AIProjectOverview = {
  name: string;
  status: string;
  location: string | null;
  client_name: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  estimated_budget: string | null;
  archived: boolean;
};

export type AIBOQItemSnapshot = {
  description: string;
  section: string | null;
  unit: string;
  estimated_quantity: string;
  completed_quantity: string;
  remaining_quantity: string;
  estimated_amount: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
  completion_status: string;
};

export type AIBOQSnapshot = {
  name: string;
  status: string;
  item_count: number;
  estimated_value: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
  remaining_sections: Array<{
    name: string;
    remaining_value: string;
    completion_percentage: number | null;
  }>;
  items: AIBOQItemSnapshot[];
};

export type AISiteReportSnapshot = {
  report_date: string;
  weather: string | null;
  work_completed: string;
  issues: string | null;
  tomorrow_plan: string | null;
  general_notes: string | null;
  worker_count: number;
};

export type AILabourSnapshot = {
  from: string;
  to: string;
  total_labour_days: string;
  total_labour_cost: string;
  average_workers_per_day: string;
  present_days: number;
  half_day_days: number;
  days_recorded: number;
  top_roles: Array<{
    role: string;
    labour_days: string;
    labour_cost: string;
  }>;
  day_stats?: {
    date: string;
    present: number;
    half_day: number;
    absent: number;
    unmarked: number;
    labour_cost: string;
  };
};

export type AIMaterialSnapshot = {
  from: string;
  to: string;
  total_material_cost: string;
  total_used_cost: string;
  stock_value: string;
  low_stock: number;
  out_of_stock: number;
  materials_in_use: number;
  stock_available: boolean;
  top_used: Array<{ name: string; quantity: string; total_cost: string }>;
  recent_transactions: Array<{
    date: string;
    type: string;
    material: string;
    quantity: string;
    total_cost: string | null;
  }>;
};

export type AIStockSnapshot = {
  stock_available: boolean;
  low_stock: Array<{ name: string; current_stock: string; status: string }>;
  out_of_stock: Array<{ name: string; current_stock: string }>;
};

export type AIExpenseSnapshot = {
  total_amount: string;
  this_month_amount: string;
  today_amount: string;
  active_count: number;
  categories: Array<{ label: string; amount: string; count: number }>;
  largest: Array<{
    date: string;
    description: string;
    category: string;
    amount: string;
  }>;
};

export type AIProjectCostSnapshot = {
  labour_cost: string;
  material_cost: string;
  other_expenses: string;
  total_cost: string;
  labour_records: number;
  material_records: number;
  expense_records: number;
  estimated_budget: string | null;
  remaining_budget: string | null;
  budget_used_percent: number | null;
  budget_status: string;
};

export type AIQuotationSnapshot = {
  quotation_number: string;
  title: string;
  status: string;
  total_amount: string;
};

export type AIEstimateVsActualSnapshot = {
  estimated_total: string | null;
  actual_total: string;
  difference: string | null;
  variance_percentage: number | null;
  over_estimate: boolean | null;
  labour?: { estimated: string; actual: string; difference: string };
  materials?: { estimated: string; actual: string; difference: string };
  other?: { estimated: string; actual: string; difference: string };
  source: "quotation" | "budget" | "boq" | "none";
};

export type AIMeasurementSnapshot = {
  date: string;
  item: string;
  quantity: string;
  unit: string | null;
  location: string | null;
};

export type AIPhotoMetadataSnapshot = {
  file_name: string;
  caption: string | null;
  created_at: string;
};

export type AIActiveProjectSnapshot = {
  name: string;
  status: string;
  location: string | null;
  actual_cost: string | null;
  estimated_budget: string | null;
  budget_status: string | null;
  latest_issue: string | null;
};

export type AIContextPayload = {
  intent: AIIntent;
  period: AIPeriod;
  project?: AIProjectOverview;
  boq?: AIBOQSnapshot;
  remaining_work?: AIBOQItemSnapshot[];
  site_reports?: AISiteReportSnapshot[];
  labour?: AILabourSnapshot;
  materials?: AIMaterialSnapshot;
  stock?: AIStockSnapshot;
  expenses?: AIExpenseSnapshot;
  cost?: AIProjectCostSnapshot;
  quotation?: AIQuotationSnapshot;
  estimate_vs_actual?: AIEstimateVsActualSnapshot;
  measurements?: AIMeasurementSnapshot[];
  photos?: AIPhotoMetadataSnapshot[];
  projects?: AIActiveProjectSnapshot[];
  missing: string[];
  sources: AISource[];
};

export type DailyReportDraft = {
  report_date: string;
  work_completed: string;
  issues: string;
  tomorrow_plan: string;
  general_notes: string;
};

export type ClientUpdateDraft = {
  title: string;
  this_week: string[];
  current_progress: string | null;
  upcoming: string[];
  issues: string[];
  closing: string;
};

export type AIAnswerMetadata = {
  intent: AIIntent;
  period: AIPeriod | null;
  sources: AISource[];
  grounded: boolean;
};

export type AIChatAction =
  | { type: "daily_report_draft"; projectId: string; draft: DailyReportDraft }
  | { type: "client_update_draft"; projectId: string; draft: ClientUpdateDraft };

export type AIProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIGenerateInput = {
  messages: AIProviderMessage[];
  maxOutputTokens?: number;
  json?: boolean;
};

export type AIGenerateResult = {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AIProvider = {
  generateResponse(input: AIGenerateInput): Promise<AIGenerateResult>;
  generateStructuredResponse<T>(
    input: AIGenerateInput,
    parse: (value: unknown) => T,
  ): Promise<{ value: T; usage: AIGenerateResult }>;
};

export type AIUsageRecord = Pick<
  AIUsage,
  "model" | "input_tokens" | "output_tokens" | "conversation_id"
>;

export type AIConversationSummary = Pick<
  AIConversation,
  "id" | "project_id" | "title" | "created_at" | "updated_at"
> & {
  project_name: string | null;
};

export type AIChatMessage = Pick<
  AIMessage,
  "id" | "role" | "content" | "created_at"
>;

export type AIChatResponse = {
  conversation: AIConversationSummary;
  message: AIChatMessage;
  metadata: AIAnswerMetadata;
  action: AIChatAction | null;
  needsProject?: boolean;
  projects?: AIProjectOption[];
};

export type AISafetyDecision = {
  allowed: true;
} | {
  allowed: false;
  message: string;
};
