export type NotificationType =
  | "daily_report"
  | "material"
  | "labour"
  | "expense"
  | "quotation"
  | "boq"
  | "client_portal"
  | "whatsapp"
  | "system";

export type NotificationPreferenceKey =
  | "daily_report_notifications"
  | "quotation_notifications"
  | "boq_notifications"
  | "labour_notifications"
  | "material_notifications"
  | "client_portal_notifications"
  | "whatsapp_notifications";

export type NotificationItem = {
  id: string;
  business_id: string;
  user_id: string;
  project_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  id: string;
  business_id: string;
  user_id: string;
  daily_report_notifications: boolean;
  quotation_notifications: boolean;
  boq_notifications: boolean;
  labour_notifications: boolean;
  material_notifications: boolean;
  client_portal_notifications: boolean;
  whatsapp_notifications: boolean;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  "id" | "business_id" | "user_id" | "created_at" | "updated_at"
> = {
  daily_report_notifications: true,
  quotation_notifications: true,
  boq_notifications: true,
  labour_notifications: false,
  material_notifications: true,
  client_portal_notifications: true,
  whatsapp_notifications: true,
};

export const PREFERENCE_KEY_BY_TYPE: Partial<
  Record<NotificationType, NotificationPreferenceKey>
> = {
  daily_report: "daily_report_notifications",
  quotation: "quotation_notifications",
  boq: "boq_notifications",
  labour: "labour_notifications",
  material: "material_notifications",
  client_portal: "client_portal_notifications",
  whatsapp: "whatsapp_notifications",
};
