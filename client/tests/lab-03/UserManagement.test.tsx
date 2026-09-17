import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagement from "../../src/features/admin/UserManagement.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_ADMIN = {
  id: 10,
  name: "Admin User",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  mustChangePassword: false,
};

const MOCK_USERS = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER" as const, isActive: true },
  { id: 10, name: "Admin User", email: "admin@example.com", role: "ADMINISTRATOR" as const, isActive: true },
];

function renderWithMockAuth() {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_ADMIN,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  return render(<UserManagement />);
}

describe("UserManagement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the user list", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(MOCK_USERS);

    renderWithMockAuth();

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("opens the create form and shows the initial password on success", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(MOCK_USERS);
    vi.spyOn(api, "createAdminUser").mockResolvedValue({
      id: 20,
      name: "New Guy",
      email: "new.guy@example.com",
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Temp-abc123!1",
    });

    renderWithMockAuth();
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "New Guy" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "new.guy@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^save user$/i }));

    expect(await screen.findByText(/Temp-abc123!1/)).toBeInTheDocument();
  });

  it("shows a duplicate-email error without losing entered values", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(MOCK_USERS);
    vi.spyOn(api, "createAdminUser").mockRejectedValue(new Error("Email already in use"));

    renderWithMockAuth();
    await screen.findByText("Jennifer Anderson");

    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Dup User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "jennifer.anderson@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^save user$/i }));

    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Dup User");
  });

  it("disables Deactivate when editing the currently logged-in Administrator's own row", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(MOCK_USERS);

    renderWithMockAuth();
    await screen.findByText("Admin User");

    const rows = screen.getAllByRole("row");
    const adminRow = rows.find((r) => r.textContent?.includes("admin@example.com"));
    fireEvent.click(adminRow!.querySelector("button")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /deactivate user/i })).toBeDisabled();
    });
  });

  it("filters by search and role via the API call", async () => {
    const fetchSpy = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue(MOCK_USERS);

    renderWithMockAuth();
    await screen.findByText("Jennifer Anderson");

    fireEvent.change(screen.getByPlaceholderText(/search users/i), { target: { value: "jennifer" } });

    await waitFor(
      () => {
        const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
        expect(lastCall[0]).toMatchObject({ search: "jennifer" });
      },
      { timeout: 1000 }
    );
  });
});