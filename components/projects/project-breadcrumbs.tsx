"use client";

import {
  Breadcrumbs,
  type BreadcrumbItem,
} from "@/components/layout/breadcrumbs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function ProjectBreadcrumbs({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const pathname = usePathname();
  const isProjectEdit = /^\/projects\/[^/]+\/edit$/.test(pathname);
  const isReports = pathname.includes("/reports");
  const isLabour = pathname.includes("/labour");
  const isMaterials = pathname.includes("/materials");
  const isExpenses = pathname.includes("/expenses");
  const isQuotations = pathname.includes("/quotations");
  const isBoq = pathname.includes("/boq");
  const isClientPortal = pathname.includes("/client-portal");
  const isAttendance = pathname.endsWith("/labour/attendance");
  const isNewReport = pathname.endsWith("/reports/new");
  const isReportEdit = /\/reports\/[^/]+\/edit$/.test(pathname);
  const reportId = pathname.match(/\/reports\/([^/]+)/)?.[1];
  const isReportDetail = Boolean(
    isReports && reportId && reportId !== "new" && !isReportEdit,
  );
  const isNewExpense = pathname.endsWith("/expenses/new");
  const isExpenseEdit = /\/expenses\/[^/]+\/edit$/.test(pathname);
  const expenseId = pathname.match(/\/expenses\/([^/]+)/)?.[1];
  const isExpenseDetail = Boolean(
    isExpenses && expenseId && expenseId !== "new" && !isExpenseEdit,
  );

  const items = useMemo<BreadcrumbItem[]>(() => {
    const trail: BreadcrumbItem[] = [
      { label: "Projects", href: "/projects" },
      {
        label: projectName,
        href:
          isProjectEdit || isReports || isLabour || isMaterials || isExpenses || isQuotations || isBoq || isClientPortal
            ? `/projects/${projectId}`
            : undefined,
      },
    ];

    if (isProjectEdit) {
      trail.push({ label: "Edit" });
      return trail;
    }

    if (isReports) {
      trail.push({
        label: "Daily reports",
        href:
          isNewReport || isReportDetail || isReportEdit
            ? `/projects/${projectId}/reports`
            : undefined,
      });
    }

    if (isNewReport) {
      trail.push({ label: "New report" });
    } else if (isReportEdit && reportId) {
      trail.push({
        label: "Report",
        href: `/projects/${projectId}/reports/${reportId}`,
      });
      trail.push({ label: "Edit" });
    } else if (isReportDetail) {
      trail.push({ label: "Report" });
    }

    if (isLabour) {
      trail.push({
        label: "Labour",
        href: isAttendance ? `/projects/${projectId}/labour` : undefined,
      });
    }

    if (isAttendance) {
      trail.push({ label: "Attendance" });
    }

    if (isMaterials) {
      trail.push({ label: "Materials" });
    }

    if (isExpenses) {
      trail.push({
        label: "Expenses",
        href:
          isNewExpense || isExpenseDetail || isExpenseEdit
            ? `/projects/${projectId}/expenses`
            : undefined,
      });
    }

    if (isNewExpense) {
      trail.push({ label: "New expense" });
    } else if (isExpenseEdit && expenseId) {
      trail.push({
        label: "Expense",
        href: `/projects/${projectId}/expenses/${expenseId}`,
      });
      trail.push({ label: "Edit" });
    } else if (isExpenseDetail) {
      trail.push({ label: "Expense" });
    }

    if (isQuotations) {
      trail.push({
        label: "Quotations",
        href: pathname.endsWith("/quotations/new")
          ? `/projects/${projectId}/quotations`
          : undefined,
      });
    }

    if (pathname.endsWith("/quotations/new")) {
      trail.push({ label: "New quotation" });
    }

    if (isBoq) {
      const isNewBoq = pathname.endsWith("/boq/new");
      const isBoqEdit = /\/boq\/[^/]+\/edit$/.test(pathname);
      const boqId = pathname.match(/\/boq\/([^/]+)/)?.[1];
      const isBoqItem = pathname.includes("/items/");
      const isBoqDetail = Boolean(
        boqId && boqId !== "new" && !isNewBoq && !isBoqEdit,
      );

      trail.push({
        label: "BOQ",
        href:
          isNewBoq || isBoqDetail || isBoqEdit || isBoqItem
            ? `/projects/${projectId}/boq`
            : undefined,
      });

      if (isNewBoq) {
        trail.push({ label: "New BOQ" });
      } else if (isBoqEdit && boqId) {
        trail.push({
          label: "BOQ detail",
          href: `/projects/${projectId}/boq/${boqId}`,
        });
        trail.push({ label: "Edit" });
      } else if (isBoqItem && boqId) {
        trail.push({
          label: "BOQ detail",
          href: `/projects/${projectId}/boq/${boqId}`,
        });
        trail.push({ label: "Item" });
      } else if (isBoqDetail) {
        trail.push({ label: "BOQ detail" });
      }
    }

    if (isClientPortal) {
      trail.push({ label: "Client portal" });
    }

    return trail;
  }, [
    isAttendance,
    isExpenseDetail,
    isExpenseEdit,
    isExpenses,
    isLabour,
    isMaterials,
    isNewExpense,
    isNewReport,
    isProjectEdit,
    isQuotations,
    isBoq,
    isClientPortal,
    isReportDetail,
    isReportEdit,
    isReports,
    expenseId,
    pathname,
    projectId,
    projectName,
    reportId,
  ]);

  return <Breadcrumbs items={items} />;
}
