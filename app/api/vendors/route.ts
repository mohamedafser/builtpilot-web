import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace } from "@/lib/api/workspace";
import { createVendor } from "@/lib/vendors/mutations";
import { getVendors, parseVendorSearchParams } from "@/lib/vendors/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { searchParams } = request.nextUrl;
  const { vendors, error, page, pageSize, total, totalPages } = await getVendors(
    parseVendorSearchParams({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }),
    parsePagination({
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    }),
  );

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Vendors loaded.", {
    vendors,
    page,
    pageSize,
    total,
    totalPages,
  });
}

export async function POST(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await createVendor(values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "You must be signed in to continue." ? 401 : 400);
    return apiError(result.error, status);
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${result.id}`);
  return apiSuccess("Vendor created.", { id: result.id }, 201);
}
