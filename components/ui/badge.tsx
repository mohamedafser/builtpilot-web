import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_TRANSACTION_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  type StockStatus,
} from "@/constants/material";
import { VENDOR_STATUS_LABELS } from "@/constants/vendor";
import { PROJECT_STATUS_LABELS } from "@/constants/project";
import {
  ATTENDANCE_STATUS_LABELS,
  WORKER_ROLE_LABELS,
  WORKER_STATUS_LABELS,
} from "@/constants/worker";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
} from "@/constants/expense";
import {
  QUOTATION_ITEM_TYPE_LABELS,
  QUOTATION_STATUS_LABELS,
} from "@/constants/quotation";
import {
  BOQ_ITEM_TYPE_LABELS,
  BOQ_MEASUREMENT_STATUS_LABELS,
  BOQ_STATUS_LABELS,
} from "@/constants/boq";
import { cn } from "@/lib/utils";
import type {
  AttendanceStatus,
  ExpenseCategory,
  ExpenseStatus,
  MaterialCategory,
  MaterialStatus,
  MaterialTransactionType,
  ProjectStatus,
  QuotationItemType,
  QuotationStatus,
  VendorStatus,
  WorkerRole,
  WorkerStatus,
  BoqItemType,
  BoqMeasurementStatus,
  BoqStatus,
} from "@/types";

const statusClasses: Record<ProjectStatus, string> = {
  planning: "bg-stone-100 text-stone-700",
  active: "bg-amber-100 text-amber-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

const workerStatusClasses: Record<WorkerStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-stone-100 text-stone-600",
};

const workerRoleClasses: Record<WorkerRole, string> = {
  mason: "bg-amber-100 text-amber-800",
  helper: "bg-stone-100 text-stone-700",
  carpenter: "bg-orange-100 text-orange-800",
  electrician: "bg-yellow-100 text-yellow-800",
  plumber: "bg-sky-100 text-sky-800",
  painter: "bg-violet-100 text-violet-800",
  welder: "bg-red-100 text-red-800",
  operator: "bg-teal-100 text-teal-800",
  supervisor: "bg-emerald-100 text-emerald-800",
  other: "bg-stone-200 text-stone-700",
};

const attendanceStatusClasses: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800",
  half_day: "bg-amber-100 text-amber-800",
  absent: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function WorkerStatusBadge({ status }: { status: WorkerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        workerStatusClasses[status],
      )}
    >
      {WORKER_STATUS_LABELS[status]}
    </span>
  );
}

export function WorkerRoleBadge({ role }: { role: WorkerRole }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        workerRoleClasses[role],
      )}
    >
      {WORKER_ROLE_LABELS[role]}
    </span>
  );
}

export function AttendanceStatusBadge({
  status,
}: {
  status: AttendanceStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        attendanceStatusClasses[status],
      )}
    >
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}

const catalogStatusClasses: Record<MaterialStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-stone-100 text-stone-600",
};

const stockStatusClasses: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-700",
};

const transactionTypeClasses: Record<MaterialTransactionType, string> = {
  received: "bg-emerald-100 text-emerald-800",
  used: "bg-orange-100 text-orange-800",
  returned: "bg-sky-100 text-sky-800",
  adjusted: "bg-violet-100 text-violet-800",
};

export function CatalogStatusBadge({
  status,
}: {
  status: MaterialStatus | VendorStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        catalogStatusClasses[status],
      )}
    >
      {status === "active"
        ? MATERIAL_STATUS_LABELS.active
        : VENDOR_STATUS_LABELS.inactive}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        stockStatusClasses[status],
      )}
    >
      {STOCK_STATUS_LABELS[status]}
    </span>
  );
}

export function MaterialCategoryBadge({
  category,
}: {
  category: MaterialCategory;
}) {
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
      {MATERIAL_CATEGORY_LABELS[category]}
    </span>
  );
}

export function TransactionTypeBadge({
  type,
}: {
  type: MaterialTransactionType;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        transactionTypeClasses[type],
      )}
    >
      {MATERIAL_TRANSACTION_TYPE_LABELS[type]}
    </span>
  );
}

const expenseStatusClasses: Record<ExpenseStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  void: "bg-red-100 text-red-700",
};

export function ExpenseCategoryBadge({
  category,
}: {
  category: ExpenseCategory;
}) {
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
      {EXPENSE_CATEGORY_LABELS[category]}
    </span>
  );
}

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        expenseStatusClasses[status],
      )}
    >
      {EXPENSE_STATUS_LABELS[status]}
    </span>
  );
}

const quotationStatusClasses: Record<QuotationStatus, string> = {
  draft: "bg-stone-100 text-stone-700",
  sent: "bg-sky-100 text-sky-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        quotationStatusClasses[status],
      )}
    >
      {QUOTATION_STATUS_LABELS[status]}
    </span>
  );
}

export function QuotationItemTypeBadge({
  type,
}: {
  type: QuotationItemType;
}) {
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
      {QUOTATION_ITEM_TYPE_LABELS[type]}
    </span>
  );
}

const boqStatusClasses: Record<BoqStatus, string> = {
  draft: "bg-stone-100 text-stone-700",
  active: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  archived: "bg-stone-200 text-stone-600",
};

export function BoqStatusBadge({ status }: { status: BoqStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        boqStatusClasses[status],
      )}
    >
      {BOQ_STATUS_LABELS[status]}
    </span>
  );
}

export function BoqItemTypeBadge({ type }: { type: BoqItemType }) {
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
      {BOQ_ITEM_TYPE_LABELS[type]}
    </span>
  );
}

const measurementStatusClasses: Record<BoqMeasurementStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  void: "bg-red-100 text-red-700",
};

export function BoqMeasurementStatusBadge({
  status,
}: {
  status: BoqMeasurementStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        measurementStatusClasses[status],
      )}
    >
      {BOQ_MEASUREMENT_STATUS_LABELS[status]}
    </span>
  );
}
