const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
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
  const res = await fetch(`${API_URL}/api/related-systems`, { credentials: "include" });
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
  updatedAt?: string;
  version?: number;
  statusChangedAt?: string;
  problemAppearsResolved?: boolean;
}

export class ApiError extends Error {
  code?: string;
  details?: any;
  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export class ApiFieldError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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

export async function fetchTickets(params: TicketListParams = {}): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load tickets");
  }
  return res.json();
}

export interface Attachment {
  id: number;
  ticketId: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
  uploadedAt: string;
}

export async function fetchTicket(ticketId: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    credentials: "include",
  });
  if (res.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!res.ok) {
    throw new Error("Unable to load ticket");
  }
  return res.json();
}

export async function fetchAttachments(ticketId: number): Promise<Attachment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load attachments");
  }
  return res.json();
}

export async function uploadAttachment(ticketId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to upload attachment");
  }
  return body;
}

export function downloadAttachmentUrl(attachmentId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download`;
}

export async function removeAttachment(attachmentId: number, reason: string): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to remove attachment");
  }
  return body;
}

export interface Comment {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  visibility: "PUBLIC" | "INTERNAL";
  createdAt: string;
}

export async function fetchComments(ticketId: number): Promise<Comment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load comments");
  }
  return res.json();
}

export async function postComment(
  ticketId: number,
  content: string,
  visibility: "PUBLIC" | "INTERNAL" = "PUBLIC"
): Promise<Comment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, visibility }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to post comment");
  }
  return body;
}

export async function markProblemResolved(ticketId: number): Promise<{ id: number; problemAppearsResolved: boolean }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indication`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to update ticket");
  }
  return body;
}

export interface StaffTicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryId: number;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  ticketOwnerId: number | null;
  ticketOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  currentStatus?: string;
  ticketOwnerId?: number | "unassigned";
  sortBy?: "createdAt" | "updatedAt";
  sortDir?: "asc" | "desc";
  page?: number;
}

export async function fetchStaffTickets(
  params: StaffTicketListParams = {}
): Promise<TicketListResponse & { data: StaffTicketListItem[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  if (params.ticketOwnerId) query.set("ticketOwnerId", String(params.ticketOwnerId));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDir) query.set("sortDir", params.sortDir);
  if (params.page) query.set("page", String(params.page));

  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load tickets");
  }
  return res.json();
}

export async function claimTicket(ticketId: number, ticketOwnerId: number) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/claim`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketOwnerId }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to claim ticket");
  }
  return body;
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  requesterId: number;
  requesterName: string;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  ticketOwnerId: number | null;
  ticketOwnerName: string | null;
  resolutionSummary: string | null;
  problemAppearsResolved: boolean;
  version?: number;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchStaffTicket(ticketId: number): Promise<StaffTicketDetail> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    credentials: "include",
  });
  if (res.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!res.ok) {
    throw new Error("Unable to load ticket");
  }
  return res.json();
}

export async function updateStaffTicket(
  ticketId: number,
  updates: {
    itPriority?: string;
    currentStatus?: string;
    ticketOwnerId?: number | null;
    expectedVersion?: number;
  }
): Promise<StaffTicketDetail> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? "Unable to update ticket", body?.error?.code, body?.error?.details);
  }
  return body;
}

export async function fetchStaffAttachments(ticketId: number): Promise<Attachment[]> {
  // Staff can reuse the same attachments endpoint since ownership checks
  // there are Requester-only; staff needs its own read path.
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load attachments");
  }
  return res.json();
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
}

export async function fetchAdminUsers(params: { search?: string; role?: string } = {}): Promise<AdminUser[]> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);

  const res = await fetch(`${API_URL}/api/admin/users?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to load users");
  }
  return res.json();
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
}

export async function createAdminUser(
  input: CreateUserInput
): Promise<AdminUser & { initialPassword: string }> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to create user");
  }
  return body;
}

export async function updateAdminUser(
  userId: number,
  updates: Partial<CreateUserInput>
): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to update user");
  }
  return body;
}

export async function resetAdminUserPassword(
  userId: number
): Promise<{ id: number; mustChangePassword: boolean; newPassword: string }> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Unable to reset password");
  }
  return body;
}

// ---------------------------------------------------------------------------
// Actions Taken (Sprint 4)
// ---------------------------------------------------------------------------
export interface ActionTaken {
  id: number;
  ticketId: number;
  actionDateTime: string;
  description: string;
  result: string;
  performedById: number;
  performedBy: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedById: number | null;
  updatedBy: {
    id: number;
    name: string;
  } | null;
}

export interface CreateActionTakenInput {
  actionDateTime?: string;
  description: string;
  result: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface UpdateActionTakenInput {
  expectedVersion: number;
  actionDateTime?: string;
  description?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export async function fetchActionsTaken(ticketId: number): Promise<ActionTaken[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
    credentials: "include",
  });
  if (res.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!res.ok) {
    throw new Error("Unable to load actions taken");
  }
  return res.json();
}

export async function createActionTaken(
  ticketId: number,
  input: CreateActionTakenInput,
  idempotencyKey?: string
): Promise<ActionTaken> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? "Unable to create action taken", body?.error?.code, body?.error?.details);
  }
  return body;
}

export async function updateActionTaken(
  ticketId: number,
  actionId: number,
  input: UpdateActionTakenInput
): Promise<ActionTaken> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/actions-taken/${actionId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? "Unable to update action taken", body?.error?.code, body?.error?.details);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Role Dashboards (Lab 4 - Issue 25)
// ---------------------------------------------------------------------------

export interface DashboardRecentTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority?: string;
  itPriority?: string | null;
  ticketOwnerId?: number | null;
  updatedAt: string;
}

export interface RequesterDashboardData {
  openTickets: number;
  waitingForRequester: number;
  recentlyResolved: number;
  closedTickets: number;
  recentlyUpdated: DashboardRecentTicket[];
}

export interface UserCountsSummary {
  active: number;
  inactive: number;
  byRole: {
    REQUESTER: number;
    IT_STAFF: number;
    ADMINISTRATOR: number;
  };
}

export interface StaffDashboardData {
  unassigned: number;
  ownedByMe: number;
  byStatus: Record<string, number>;
  byItPriority: Record<string, number>;
  urgent: DashboardRecentTicket[];
  recentlyUpdated: DashboardRecentTicket[];
  userCounts?: UserCountsSummary;
}

export async function fetchRequesterDashboard(): Promise<RequesterDashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard/requester`, {
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? "Unable to load requester dashboard", body?.error?.code);
  }
  return body;
}

export async function fetchStaffDashboard(): Promise<StaffDashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard/staff`, {
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? "Unable to load staff dashboard", body?.error?.code);
  }
  return body;
}