import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffTicketQueue from "../../src/features/staff/StaffTicketQueue.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_STAFF_USER = {
  id: 3,
  name: "Kevin Patel",
  email: "kevin.patel@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const MOCK_TICKET_UNASSIGNED = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  categoryId: 1,
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketOwnerId: null,
  ticketOwnerName: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_TICKET_ASSIGNED = {
  ...MOCK_TICKET_UNASSIGNED,
  id: 2,
  ticketNumber: "TKT-2026-000002",
  ticketOwnerId: 3,
  ticketOwnerName: "Kevin Patel",
};

function renderWithMockAuth() {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_STAFF_USER,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <StaffTicketQueue />
    </MemoryRouter>
  );
}

describe("StaffTicketQueue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when there are no tickets in the queue", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });

    renderWithMockAuth();

    expect(await screen.findByText(/no tickets in the queue/i)).toBeInTheDocument();
  });

  it("renders tickets across requesters, including one with an owner and one unassigned", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [MOCK_TICKET_UNASSIGNED, MOCK_TICKET_ASSIGNED],
      pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    });

    renderWithMockAuth();

    expect(await screen.findAllByText("TKT-2026-000001")).toBeTruthy();
    expect(screen.getAllByText("TKT-2026-000002").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kevin Patel").length).toBeGreaterThan(0);
  });

  it("shows a Claim button for an unassigned ticket and calls the API on click", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [MOCK_TICKET_UNASSIGNED],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    const claimSpy = vi.spyOn(api, "claimTicket").mockResolvedValue({ ...MOCK_TICKET_UNASSIGNED, ticketOwnerId: 3 });

    renderWithMockAuth();

    const claimButtons = await screen.findAllByRole("button", { name: /^claim$/i });
    fireEvent.click(claimButtons[0]);

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith(1, 3);
    });
  });

  it("triggers a refetch with search and itPriority query params", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [MOCK_TICKET_UNASSIGNED],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    renderWithMockAuth();
    await screen.findAllByText("TKT-2026-000001");

    fireEvent.change(screen.getByPlaceholderText(/search by ticket number/i), {
      target: { value: "battery" },
    });

    await waitFor(
      () => {
        const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
        expect(lastCall[0]).toMatchObject({ search: "battery" });
      },
      { timeout: 1000 }
    );
  });

  it("shows an error state when the API call fails", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchStaffTickets").mockRejectedValue(new Error("network down"));

    renderWithMockAuth();

    expect(await screen.findByText(/unable to load tickets/i)).toBeInTheDocument();
  });
});