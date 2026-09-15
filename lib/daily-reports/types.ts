import type { ManpowerCounts } from "@/constants/daily-report";
import type {
  DailyReportManpower,
  DailyReportMaterial,
  DailySiteReport,
  SitePhoto,
} from "@/types";

export type DailyReportListItem = DailySiteReport & {
  created_by_name: string | null;
  photo_count: number;
  worker_count: number;
  project_name?: string;
};

export type SitePhotoWithUrl = SitePhoto & {
  signed_url: string | null;
  uploaded_by_name: string | null;
};

export type DailyReportDetail = {
  report: DailySiteReport;
  created_by_name: string | null;
  manpower: DailyReportManpower[];
  manpower_counts: ManpowerCounts;
  worker_count: number;
  materials: DailyReportMaterial[];
  photos: SitePhotoWithUrl[];
};

export type DailyReportStats = {
  total: number;
  latest: DailyReportListItem | null;
};

export type DailyReportFilters = {
  query?: string;
  from?: string;
  to?: string;
  archived?: boolean;
  limit?: number;
};
