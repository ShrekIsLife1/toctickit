const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Unable to load categories");
  }
  return res.json();
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Unable to load related systems");
  }
  return res.json();
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  ticketOwnerId: number | null;
  resolutionSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ApiFieldError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

export async function createTicket(
  requesterId: number,
  input: CreateTicketInput
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(requesterId),
    },
    body: JSON.stringify(input),
  });

  const body = await res.json();

  if (!res.ok) {
    if (body?.error?.fields) {
      throw new ApiFieldError(body.error.message, body.error.fields);
    }
    throw new Error(body?.error?.message ?? "Unable to create ticket");
  }

  return body;
}
// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }
  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Unable to load requesters");
  }
  return res.json();
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryId: number;
  requestedPriority: string;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  data: TicketListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: "createdAt" | "updatedAt";
  sortDir?: "asc" | "desc";
  page?: number;
}

export async function fetchTickets(
  requesterId: number,
  params: TicketListParams = {}
): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!res.ok) {
    throw new Error("Unable to load tickets");
  }
  return res.json();
}