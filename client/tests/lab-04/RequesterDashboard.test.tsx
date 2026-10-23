import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequesterDashboard from "../../src/features/dashboard/RequesterDashboard";
import * as api from "../../src/api";
import * as authContext from "../../src/context/AuthContext";

const MOCK_REQUESTER_USER = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const MOCK_DASHBOARD_DATA: api.RequesterDashboardData = {
  openTickets: 3,
  waitingForRequester: 1,
  recentlyResolved: 2,
  closedTickets: 5,
  recentlyUpdated: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "VPN access keeps failing",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "HIGH",
      updatedAt: new Date().toISOString(),
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Request new monitor",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "LOW",
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("UI-07: Requester Dashboard (AC-02, AC-16, UI-07)", () => {
  beforeEach(() => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_REQUESTER_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders metric cards and greeting with accurate data", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(MOCK_DASHBOARD_DATA);

    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/welcome back, jennifer!/i)).toBeInTheDocument();
    });

    // Check metric values
    expect(screen.getByText("3")).toBeInTheDocument(); // openTickets
    expect(screen.getByText("1")).toBeInTheDocument(); // waitingForRequester
    expect(screen.getByText("2")).toBeInTheDocument(); // recentlyResolved
    expect(screen.getByText("5")).toBeInTheDocument(); // closedTickets

    // Check recent tickets rendered
    expect(screen.getAllByText("TKT-2026-000101")[0]).toBeInTheDocument();
    expect(screen.getAllByText("VPN access keeps failing")[0]).toBeInTheDocument();
  });

  it("navigates to filtered queue when clicking metric cards", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(MOCK_DASHBOARD_DATA);

    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/my open tickets: 3 tickets/i)).toBeInTheDocument();
    });

    // Click My Open Tickets card
    fireEvent.click(screen.getByLabelText(/my open tickets: 3 tickets/i));
    expect(mockNavigate).toHaveBeenCalledWith("/my-tickets?status=active");

    // Click Waiting for You card
    fireEvent.click(screen.getByLabelText(/waiting for you: 1 tickets/i));
    expect(mockNavigate).toHaveBeenCalledWith("/my-tickets?status=WAITING_FOR_REQUESTER");
  });

  it("UI-10: Shows empty state when requester has zero tickets", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue({
      openTickets: 0,
      waitingForRequester: 0,
      recentlyResolved: 0,
      closedTickets: 0,
      recentlyUpdated: [],
    });

    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tickets found. submit a request to get started./i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
  });

  it("UI-10: Displays error banner and allows Retry on failure", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchRequesterDashboard")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(MOCK_DASHBOARD_DATA);

    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, jennifer!/i)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
