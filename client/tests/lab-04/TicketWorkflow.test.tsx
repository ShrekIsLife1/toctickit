import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import StaffTicketDetail from "../../src/features/staff/StaffTicketDetail.js";
import RequesterTicketDetail from "../../src/features/tickets/RequesterTicketDetail.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_STAFF = {
  id: 2,
  name: "Kevin Patel",
  email: "kevin.patel@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const MOCK_REQUESTER = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const MOCK_IN_PROGRESS_TICKET: api.StaffTicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  requesterName: "Jennifer Anderson",
  categoryId: 1,
  relatedSystemId: 1,
  summary: "VPN connectivity issue",
  description: "VPN drops connection periodically.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ticketOwnerId: 2,
  ticketOwnerName: "Kevin Patel",
  resolutionSummary: null,
  problemAppearsResolved: false,
  version: 3,
  statusChangedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderStaffTicket(ticket: api.StaffTicketDetail) {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_STAFF,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  vi.spyOn(api, "fetchStaffTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "fetchStaffAttachments").mockResolvedValue([]);
  vi.spyOn(api, "fetchComments").mockResolvedValue([]);

  return render(
    <MemoryRouter initialEntries={[`/staff/tickets/${ticket.id}`]}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderRequesterTicket(ticket: api.Ticket) {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_REQUESTER,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  vi.spyOn(api, "fetchTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "fetchAttachments").mockResolvedValue([]);
  vi.spyOn(api, "fetchComments").mockResolvedValue([]);

  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticket.id}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UI-05: Staff Ticket Workflow & Resolution Gate (AC-08, AC-09, AC-10)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("only displays permitted transitions for IN_PROGRESS status", async () => {
    renderStaffTicket(MOCK_IN_PROGRESS_TICKET);
    await screen.findByText("TKT-2026-000101");

    const statusSelect = screen.getByDisplayValue("IN_PROGRESS") as HTMLSelectElement;
    const optionValues = Array.from(statusSelect.options).map((o) => o.value);

    // Permitted from IN_PROGRESS: WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    expect(optionValues).toContain("IN_PROGRESS");
    expect(optionValues).toContain("WAITING_FOR_REQUESTER");
    expect(optionValues).toContain("RESOLVED");
    expect(optionValues).toContain("CANCELLED");

    // Disallowed from IN_PROGRESS: CLOSED, NEW, OPEN, REOPENED
    expect(optionValues).not.toContain("CLOSED");
    expect(optionValues).not.toContain("NEW");
    expect(optionValues).not.toContain("OPEN");
    expect(optionValues).not.toContain("REOPENED");
  });

  it("displays resolution gate missing items when transition to RESOLVED fails (409)", async () => {
    const updateSpy = vi.spyOn(api, "updateStaffTicket").mockRejectedValue(
      new api.ApiError(
        "Ticket cannot be resolved until all resolution gate requirements are satisfied.",
        "RESOLUTION_GATE_NOT_MET",
        ["Ticket must have an assigned owner", "Ticket must have at least one Action Taken recorded"]
      )
    );

    renderStaffTicket(MOCK_IN_PROGRESS_TICKET);
    await screen.findByText("TKT-2026-000101");

    const statusSelect = screen.getByDisplayValue("IN_PROGRESS");
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    expect(updateSpy).toHaveBeenCalledWith(101, {
      currentStatus: "RESOLVED",
      expectedVersion: 3,
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/resolution gate requirements are satisfied/i)).toBeInTheDocument();
    expect(screen.getByText("Ticket must have an assigned owner")).toBeInTheDocument();
    expect(screen.getByText("Ticket must have at least one Action Taken recorded")).toBeInTheDocument();
  });

  it("shows reload button on stale update conflict (409 STALE_UPDATE)", async () => {
    vi.spyOn(api, "updateStaffTicket").mockRejectedValue(
      new api.ApiError(
        "This Ticket has been modified by another user. Please reload the latest changes.",
        "STALE_UPDATE",
        { currentVersion: 4 }
      )
    );

    renderStaffTicket(MOCK_IN_PROGRESS_TICKET);
    await screen.findByText("TKT-2026-000101");

    const statusSelect = screen.getByDisplayValue("IN_PROGRESS");
    fireEvent.change(statusSelect, { target: { value: "WAITING_FOR_REQUESTER" } });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/modified by another user/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: /reload ticket/i });
    expect(reloadBtn).toBeInTheDocument();

    // Clicking reload fetches the updated ticket
    const fetchSpy = vi.spyOn(api, "fetchStaffTicket").mockResolvedValue({
      ...MOCK_IN_PROGRESS_TICKET,
      version: 4,
    });
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(101);
    });
  });
});

describe("UI-06: Requester Problem Resolved Advisory (AC-11, D-05)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders 'Mark Problem as Resolved' button for active working tickets and updates state on click", async () => {
    const activeTicket: api.Ticket = {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Display issue",
      description: "Screen flickers.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "IN_PROGRESS",
      ticketOwnerId: 2,
      resolutionSummary: null,
      problemAppearsResolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const markSpy = vi.spyOn(api, "markProblemResolved").mockResolvedValue({
      id: 201,
      problemAppearsResolved: true,
    });

    renderRequesterTicket(activeTicket);
    await screen.findByText("TKT-2026-000201");

    const markBtn = screen.getByRole("button", { name: /mark problem as resolved/i });
    expect(markBtn).toBeInTheDocument();

    fireEvent.click(markBtn);

    expect(markSpy).toHaveBeenCalledWith(201);
    expect(await screen.findByText(/you marked this as resolved/i)).toBeInTheDocument();
  });

  it("does not render 'Mark Problem as Resolved' button when ticket is CLOSED", async () => {
    const closedTicket: api.Ticket = {
      id: 202,
      ticketNumber: "TKT-2026-000202",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Closed ticket",
      description: "Old resolved issue.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CLOSED",
      ticketOwnerId: 2,
      resolutionSummary: "Fixed",
      problemAppearsResolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    renderRequesterTicket(closedTicket);
    await screen.findByText("TKT-2026-000202");

    expect(screen.queryByRole("button", { name: /mark problem as resolved/i })).not.toBeInTheDocument();
  });
});
