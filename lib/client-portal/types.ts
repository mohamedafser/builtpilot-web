import type { BoqSummary } from "@/lib/boq/types";
import type { ProjectCostTotals } from "@/lib/costs/types";
import type { PaginationMeta } from "@/lib/api/pagination";
import type {
  BoqUnit,
  DiscountType,
  ManpowerRole,
  ProjectStatus,
} from "@/types";

export type ClientPortalAccessStatus =
  | "ok"
  | "invalid"
  | "expired"
  | "revoked";

export type ClientPortalSettings = {
  show_project_overview: boolean;
  show_daily_reports: boolean;
  show_site_photos: boolean;
  show_boq: boolean;
  show_measurements: boolean;
  show_quotation: boolean;
  show_project_cost: boolean;
  show_client_contact: boolean;
  show_project_location: boolean;
};

export type ClientPortalModule =
  | "overview"
  | "reports"
  | "photos"
  | "boq"
  | "measurements"
  | "quotation"
  | "cost";

export type PortalBase =
  | { kind: "public"; token: string }
  | { kind: "preview"; projectId: string };

export type ClientPortalSession = {
  status: "ok";
  isPreview: boolean;
  base: PortalBase;
  access: {
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
  };
  settings: ClientPortalSettings;
  project: {
    name: string;
    status: ProjectStatus;
    location: string | null;
    description: string | null;
    start_date: string | null;
    expected_end_date: string | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
  };
  businessName: string;
};

export type ClientPortalBlocked = {
  status: Exclude<ClientPortalAccessStatus, "ok">;
};

export type ClientPortalSessionResult =
  | ClientPortalSession
  | ClientPortalBlocked;

export type ClientPortalAccessSummary = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  portal_status: "active" | "inactive" | "expired";
};

export type ContractorClientPortalState = {
  project_id: string;
  project_name: string;
  access: ClientPortalAccessSummary | null;
  settings: ClientPortalSettings;
};

export type ClientPortalReport = {
  id: string;
  report_date: string;
  weather: string | null;
  work_completed: string;
  issues: string | null;
  tomorrow_plan: string | null;
  general_notes: string | null;
  photo_count: number;
  worker_count: number;
};

export type ClientPortalReportDetail = {
  report: Omit<ClientPortalReport, "photo_count" | "worker_count">;
  manpower: Array<{ role: ManpowerRole; worker_count: number }>;
};

export type ClientPortalPhoto = {
  id: string;
  caption: string | null;
  created_at: string;
  report_date: string | null;
  signed_url: string | null;
};

export type ClientPortalBOQItem = {
  id: string;
  section_id: string | null;
  section_name: string | null;
  item_code: string | null;
  description: string;
  unit: BoqUnit;
  estimated_quantity: string;
  completed_quantity: string;
  remaining_quantity: string;
  rate: string;
  estimated_amount: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
};

export type ClientPortalBOQ = {
  id: string;
  name: string;
  items: ClientPortalBOQItem[];
  summary: BoqSummary;
};

export type ClientPortalMeasurement = {
  id: string;
  measurement_date: string;
  quantity: string;
  unit: BoqUnit;
  location: string | null;
  description: string | null;
  reference: string | null;
  item_description: string;
};

export type ClientPortalQuotationItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_amount: string;
};

export type ClientPortalQuotation = {
  quotation_number: string;
  title: string;
  quotation_date: string;
  valid_until: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  subtotal: string;
  discount_type: DiscountType | null;
  discount_value: string;
  discount_amount: string;
  tax_percentage: string | null;
  tax_amount: string;
  total_amount: string;
  notes: string | null;
  terms: string | null;
  items: ClientPortalQuotationItem[];
};

export type ClientPortalCostSummary = ProjectCostTotals;

export type ClientPortalOverview = {
  latestReport: ClientPortalReport | null;
  recentPhotos: ClientPortalPhoto[];
  boq: ClientPortalBOQ | null;
  measurementCount: number;
  quotation: Pick<
    ClientPortalQuotation,
    "quotation_number" | "title" | "total_amount"
  > | null;
  cost: ClientPortalCostSummary | null;
};

export type ClientPortalListResult<T> = {
  items: T[];
} & PaginationMeta;
