export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page);
  const rawPageSize = Number(query.pageSize);

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 50 ? rawPageSize : 10;

  return { page, pageSize };
}

const SORTABLE_FIELDS = ["createdAt", "updatedAt"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export function parseSort(query: Record<string, unknown>): { sortBy: SortableField; sortDir: "asc" | "desc" } {
  const sortBy = SORTABLE_FIELDS.includes(query.sortBy as SortableField)
    ? (query.sortBy as SortableField)
    : "createdAt";
  const sortDir = query.sortDir === "asc" ? "asc" : "desc";
  return { sortBy, sortDir };
}
