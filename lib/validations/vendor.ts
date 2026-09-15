import { z } from "zod";
import { VENDOR_STATUSES } from "@/constants/vendor";

const optionalText = z
  .string()
  .trim()
  .max(200, "This field is too long.")
  .optional()
  .or(z.literal(""));

const optionalNotes = z
  .string()
  .trim()
  .max(5000, "Notes are too long.")
  .optional()
  .or(z.literal(""));

const optionalAddress = z
  .string()
  .trim()
  .max(500, "Address is too long.")
  .optional()
  .or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .max(200, "Email is too long.")
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, "Enter a valid email address.");

export const createVendorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Vendor name must be at least 2 characters.")
    .max(120, "Vendor name is too long."),
  contact_person: optionalText,
  phone: optionalText,
  email: optionalEmail,
  address: optionalAddress,
  notes: optionalNotes,
});

export const updateVendorSchema = createVendorSchema.extend({
  status: z.enum(VENDOR_STATUSES),
});

export const assignVendorToProjectsSchema = z.object({
  project_ids: z
    .array(z.string().uuid("Select a valid project."))
    .min(1, "Select at least one project.")
    .max(50, "Select up to 50 projects at a time."),
});

export type CreateVendorFormValues = z.infer<typeof createVendorSchema>;
export type UpdateVendorFormValues = z.infer<typeof updateVendorSchema>;
export type VendorFormValues = CreateVendorFormValues & {
  status?: UpdateVendorFormValues["status"];
};
export type AssignVendorToProjectsValues = z.infer<
  typeof assignVendorToProjectsSchema
>;
