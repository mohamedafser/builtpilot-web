import type { OrganizationRole } from "@/lib/permissions/roles";
import { ORGANIZATION_ROLE_LABELS, ROLE_HIERARCHY } from "@/lib/permissions/roles";

export type RoleAccessGuide = {
  role: OrganizationRole;
  label: string;
  summary: string;
  can: string[];
  cannot: string[];
};

/** Exact access copy for Owner/Admin when inviting teammates. */
export const ROLE_ACCESS_GUIDES: RoleAccessGuide[] = [
  {
    role: "owner",
    label: ORGANIZATION_ROLE_LABELS.owner,
    summary: "Full control of the organization and every feature.",
    can: [
      "Dashboard, AI, account",
      "Organization settings (country, currency)",
      "Team: view, invite, remove, change all roles",
      "Billing, transfer ownership, delete organization",
      "Projects: view, create, edit, archive",
      "Quotations, BOQ, materials, labour, vendors",
      "Reports, expenses, receive materials, tasks",
    ],
    cannot: [],
  },
  {
    role: "admin",
    label: ORGANIZATION_ROLE_LABELS.admin,
    summary: "Full operational admin without ownership controls.",
    can: [
      "Dashboard, AI, account",
      "Organization settings (country, currency)",
      "Team: view, invite, remove, change non-Owner roles",
      "Projects: view, create, edit, archive",
      "Quotations, BOQ, materials, labour, vendors",
      "Reports, expenses, receive materials, tasks",
    ],
    cannot: [
      "Transfer ownership",
      "Delete organization",
      "Assign or become Owner",
      "Owner-only billing controls",
    ],
  },
  {
    role: "project_manager",
    label: ORGANIZATION_ROLE_LABELS.project_manager,
    summary: "Runs projects and operations — no team or org settings.",
    can: [
      "Dashboard, AI, account",
      "Projects: view, create, edit, archive",
      "Quotations: view, create, edit",
      "Materials, labour, vendors",
      "Reports, expenses, BOQ, tasks",
    ],
    cannot: [
      "Organization settings",
      "Team / users / invites / role changes",
      "Billing or ownership",
    ],
  },
  {
    role: "engineer",
    label: ORGANIZATION_ROLE_LABELS.engineer,
    summary: "Delivery work on projects — BOQ, materials, and tasks.",
    can: [
      "Dashboard, AI, account",
      "Projects: view only",
      "BOQ: view, create, edit",
      "Materials: view, create, edit",
      "Tasks: view, create, update",
    ],
    cannot: [
      "Create or archive projects",
      "Quotations, labour, vendors, reports, expenses",
      "Organization settings, team, billing",
    ],
  },
  {
    role: "site_supervisor",
    label: ORGANIZATION_ROLE_LABELS.site_supervisor,
    summary: "Site ops — materials, labour, and task updates.",
    can: [
      "Dashboard, AI, account",
      "Projects: view only",
      "Materials: view, create, edit, receive",
      "Labour: view, create, update",
      "Tasks: view, update",
      "Reports: view, create, update",
    ],
    cannot: [
      "Create or archive projects",
      "Quotations, BOQ, vendors, expenses",
      "Organization settings, team, billing",
    ],
  },
  {
    role: "worker",
    label: ORGANIZATION_ROLE_LABELS.worker,
    summary: "Minimal access — dashboard and assigned tasks only.",
    can: [
      "Dashboard, account",
      "Projects: view only",
      "Tasks: view and update status",
    ],
    cannot: [
      "AI Copilot",
      "Create/edit projects, quotations, BOQ",
      "Materials, labour, vendors, reports, expenses",
      "Organization settings, team, billing",
    ],
  },
];

/** Roles shown in invite UI and access guide (excludes legacy member). */
export const GUIDE_ROLES = ROLE_HIERARCHY.filter((role) => role !== "member");

export type AccessMatrixRow = {
  label: string;
  access: Record<OrganizationRole, boolean>;
};

export const ACCESS_MATRIX: AccessMatrixRow[] = [
  {
    label: "Dashboard",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: true,
      worker: true,
      member: true,
    },
  },
  {
    label: "AI Copilot",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: true,
      worker: false,
      member: false,
    },
  },
  {
    label: "Organization settings",
    access: {
      owner: true,
      admin: true,
      project_manager: false,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Team / invite users",
    access: {
      owner: true,
      admin: true,
      project_manager: false,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Change member roles",
    access: {
      owner: true,
      admin: true,
      project_manager: false,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Billing & ownership",
    access: {
      owner: true,
      admin: false,
      project_manager: false,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "View projects",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: true,
      worker: true,
      member: true,
    },
  },
  {
    label: "Create / manage projects",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Quotations",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "BOQ",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Materials",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: true,
      worker: false,
      member: false,
    },
  },
  {
    label: "Receive materials",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: true,
      worker: false,
      member: false,
    },
  },
  {
    label: "Labour / workers",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: true,
      worker: false,
      member: false,
    },
  },
  {
    label: "Vendors",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: false,
      worker: false,
      member: false,
    },
  },
  {
    label: "Reports",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: false,
      site_supervisor: true,
      worker: false,
      member: false,
    },
  },
  {
    label: "Tasks",
    access: {
      owner: true,
      admin: true,
      project_manager: true,
      engineer: true,
      site_supervisor: true,
      worker: true,
      member: false,
    },
  },
];
