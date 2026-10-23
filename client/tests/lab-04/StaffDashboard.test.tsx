import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "../../src/features/dashboard/StaffDashboard";
import AppShell from "../../src/components/AppShell";
import * as api from "../../src/api";
import * as authContext from "../../src/context/AuthContext";

const MOCK_STAFF_USER = {
  id: 3,
  name: "Kevin Patel",
  email: "kevin.patel@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const MOCK_ADMIN_USER = {
  id: 5,
  name: "Admin Boss",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
};

const MOCK_STAFF_DATA: api.StaffDashboardData = {
  unassigned: 4,
  ownedByMe: 6,
  byStatus: {
    NEW: 3,
    OPEN: 5,
    IN_PROGRESS: 4,
    WAITING_FOR_REQUESTER: 2,
    REOPENED: 1,
  },
  byItPriority: {
    LOW: 2,
    MEDIUM: 8,
    HIGH: 5,
  },
  urgent: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "Server rack UPS smoking",
      currentStatus: "IN_PROGRESS",
      itPriority: "HIGH",
      ticketOwnerId: 3,
      updatedAt: new Date().toISOString(),
    },
  ],
  recentlyUpdated: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "Server rack UPS smoking",
      currentStatus: "IN_PROGRESS",
      itPriority: "HIGH",
      ticketOwnerId: 3,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 202,
      ticketNumber: "TKT-2026-000202",
      summary: "Mouse cursor lagging",
      currentStatus: "NEW",
      itPriority: "LOW",
      ticketOwnerId: null,
      updatedAt: new Date().toISOString(),
    },
  ],
};

const MOCK_ADMIN_DATA: api.StaffDashboardData = {
  ...MOCK_STAFF_DATA,
  userCounts: {
    active: 28,
    inactive: 2,
    byRole: {
      REQUESTER: 22,
      IT_STAFF: 6,
      ADMINISTRATOR: 2,
    },
  },
};

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("UI-08, UI-09, UI-10: Staff and Administrator Dashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
  });

  it("UI-08: Renders operational metrics, urgent tickets, and card drill-downs for IT Staff", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(MOCK_STAFF_DATA);

    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading queue metrics/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/welcome back, kevin!/i)).toBeInTheDocument();
    });

    // Check metric values
    expect(screen.getAllByText("4")[0]).toBeInTheDocument(); // unassigned
    expect(screen.getByText("6")).toBeInTheDocument(); // ownedByMe

    // Check urgent ticket
    expect(screen.getAllByText("TKT-2026-000201")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Server rack UPS smoking")[0]).toBeInTheDocument();

    // Verify card drill-down click
    fireEvent.click(screen.getByLabelText(/unassigned tickets: 4/i));
    expect(mockNavigate).toHaveBeenCalledWith("/staff/queue?owner=unassigned");

    fireEvent.click(screen.getByLabelText(/my assigned tickets: 6/i));
    expect(mockNavigate).toHaveBeenCalledWith("/staff/queue?owner=me");

    // UI-09: Verify Admin widget is completely omitted for IT Staff
    expect(screen.queryByText(/system user accounts/i)).not.toBeInTheDocument();
  });

  it("UI-09: Renders User Accounts widget for Administrator role", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_ADMIN_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(MOCK_ADMIN_DATA);

    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/system user accounts/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("Inactive Users")).toBeInTheDocument();
    expect(screen.getAllByText("2")[0]).toBeInTheDocument();
    expect(screen.getByText("Manage Users →")).toBeInTheDocument();
  });

  it("UI-10: Handles error recovery with Retry", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const fetchSpy = vi
      .spyOn(api, "fetchStaffDashboard")
      .mockRejectedValueOnce(new Error("Database connection lost"))
      .mockResolvedValueOnce(MOCK_STAFF_DATA);

    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/database connection lost/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome back, kevin!/i)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("UI-11: Role-Based Navigation Shell (AC-20)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders role links and marks Dashboard active on /staff/dashboard", () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/staff/dashboard"]}>
        <AppShell>
          <div>Page content</div>
        </AppShell>
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole("link", { name: /^dashboard$/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveClass("active");

    const queueLink = screen.getByRole("link", { name: /ticket queue/i });
    expect(queueLink).toBeInTheDocument();
    expect(queueLink).not.toHaveClass("active");
  });
});
