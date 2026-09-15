export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type Pagination = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parsePagination(searchParams: {
  page?: string | null;
  page_size?: string | null;
}): Pagination {
  const parsedPage = Number.parseInt(searchParams.page ?? "1", 10);
  const parsedSize = Number.parseInt(
    searchParams.page_size ?? String(DEFAULT_PAGE_SIZE),
    10,
  );

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = Number.isFinite(parsedSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, parsedSize))
    : DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1,
  };
}

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));

  return {
    page,
    pageSize,
    total,
    totalPages,
  };
}
