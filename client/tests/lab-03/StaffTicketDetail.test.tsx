import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import StaffTicketDetail from "../../src/features/staff/StaffTicketDetail.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_STAFF_USER = {
  id: 3,
  name: "Kevin Patel",
  email: "kevin.patel@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const MOCK_TICKET = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  requesterName: "Jennifer Anderson",
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drains much faster than usual.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketOwnerId: null,
  ticketOwnerName: null,
  resolutionSummary: null,
  problemAppearsResolved: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderAtTicket(ticketId: number) {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_STAFF_USER,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={[`/staff/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockCommonApis() {
  vi.spyOn(api, "fetchStaffAttachments").mockResolvedValue([]);
  vi.spyOn(api, "fetchComments").mockResolvedValue([]);
}

describe("StaffTicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before the ticket resolves", () => {
    vi.spyOn(api, "fetchStaffTicket").mockReturnValue(new Promise(() => {}));
    mockCommonApis();

    renderAtTicket(42);

    expect(screen.getByText(/loading ticket/i)).toBeInTheDocument();
  });

  it("renders ticket fields and a Claim button when unassigned", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(MOCK_TICKET);
    mockCommonApis();

    renderAtTicket(42);

    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim this ticket/i })).toBeInTheDocument();
  });

  it("only offers permitted next statuses in the status dropdown", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(MOCK_TICKET); // currentStatus: NEW
    mockCommonApis();

    renderAtTicket(42);
    await screen.findByText("TKT-2026-000042");

    const statusSelect = screen.getByDisplayValue("NEW") as HTMLSelectElement;
    const optionValues = Array.from(statusSelect.options).map((o) => o.value);

    expect(optionValues).toContain("OPEN");
    expect(optionValues).not.toContain("CLOSED");
    expect(optionValues).not.toContain("RESOLVED");
  });

  it("calls updateStaffTicket when changing IT Priority", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(MOCK_TICKET);
    mockCommonApis();
    const updateSpy = vi.spyOn(api, "updateStaffTicket").mockResolvedValue({ ...MOCK_TICKET, itPriority: "HIGH" });

    renderAtTicket(42);
    await screen.findByText("TKT-2026-000042");

    fireEvent.change(screen.getByDisplayValue(/not yet triaged/i), { target: { value: "HIGH" } });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(42, { itPriority: "HIGH" });
    });
  });

  it("calls claimTicket when clicking Claim this Ticket", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(MOCK_TICKET);
    mockCommonApis();
    const claimSpy = vi.spyOn(api, "claimTicket").mockResolvedValue({ ...MOCK_TICKET, ticketOwnerId: 3 });

    renderAtTicket(42);
    await screen.findByText("TKT-2026-000042");

    fireEvent.click(screen.getByRole("button", { name: /claim this ticket/i }));

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith(42, 3);
    });
  });

  it("separates Public Comments from Internal Notes into distinct panels", async () => {
    vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(MOCK_TICKET);
    vi.spyOn(api, "fetchStaffAttachments").mockResolvedValue([]);
    vi.spyOn(api, "fetchComments").mockResolvedValue([
      {
        id: 1,
        ticketId: 42,
        authorId: 1,
        authorName: "Jennifer Anderson",
        authorRole: "REQUESTER",
        content: "A public update.",
        visibility: "PUBLIC",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        ticketId: 42,
        authorId: 3,
        authorName: "Kevin Patel",
        authorRole: "IT_STAFF",
        content: "An internal-only note.",
        visibility: "INTERNAL",
        createdAt: new Date().toISOString(),
      },
    ]);

    renderAtTicket(42);

    expect(await screen.findByText("A public update.")).toBeInTheDocument();
    expect(screen.getByText("An internal-only note.")).toBeInTheDocument();
    expect(screen.getByText(/internal notes/i)).toBeInTheDocument();
  });
});