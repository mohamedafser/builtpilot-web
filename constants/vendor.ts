import type { Vendor, VendorStatus } from "@/types";

export const VENDOR_STATUSES: readonly VendorStatus[] = [
  "active",
  "inactive",
] as const;

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function isVendorStatus(value: string): value is VendorStatus {
  return (VENDOR_STATUSES as readonly string[]).includes(value);
}

export function vendorToFormValues(vendor: Vendor) {
  return {
    name: vendor.name,
    contact_person: vendor.contact_person ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    address: vendor.address ?? "",
    notes: vendor.notes ?? "",
    status: vendor.status,
  };
}
