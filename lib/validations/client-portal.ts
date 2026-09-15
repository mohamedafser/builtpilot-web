import { z } from "zod";

const optionalContact = z
  .string()
  .trim()
  .max(200, "This field is too long.")
  .optional()
  .or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Email address is too long.")
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return z.string().email().safeParse(value).success;
  }, "Enter a valid email address.");

export const clientPortalSettingsSchema = z.object({
  show_project_overview: z.boolean(),
  show_daily_reports: z.boolean(),
  show_site_photos: z.boolean(),
  show_boq: z.boolean(),
  show_measurements: z.boolean(),
  show_quotation: z.boolean(),
  show_project_cost: z.boolean(),
  show_client_contact: z.boolean(),
  show_project_location: z.boolean(),
});

export const clientPortalAccessSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(120, "Client name is too long."),
  client_email: optionalEmail,
  client_phone: optionalContact,
});

export const clientPortalEnableSchema = clientPortalAccessSchema.merge(
  clientPortalSettingsSchema.partial(),
);

export const clientPortalUpdateSchema = clientPortalAccessSchema
  .partial()
  .merge(clientPortalSettingsSchema.partial());

export type ClientPortalEnableValues = z.infer<typeof clientPortalEnableSchema>;
export type ClientPortalUpdateValues = z.infer<typeof clientPortalUpdateSchema>;
export type ClientPortalSettingsValues = z.infer<
  typeof clientPortalSettingsSchema
>;
