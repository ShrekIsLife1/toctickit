import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequesterTicketDetail from "../../src/features/tickets/RequesterTicketDetail.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_USER = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const MOCK_TICKET = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  categoryId: 1,
  relatedSystemId: 1,
  summary: "Laptop battery drains quickly",
  description: "Battery drains much faster than usual.",
  requestedPriority: "MEDIUM",
  itPriority: null,
  currentStatus: "NEW",
  ticketOwnerId: null,
  resolutionSummary: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderAtTicket(ticketId: number) {
  vi.spyOn(authContext, "useAuth").mockReturnValue({
    user: MOCK_USER,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequesterTicketDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before the ticket resolves", () => {
    vi.spyOn(api, "fetchTicket").mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, "fetchAttachments").mockResolvedValue([]);

    renderAtTicket(42);

    expect(screen.getByText(/loading ticket/i)).toBeInTheDocument();
  });

  it("renders read-only ticket fields on success", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(MOCK_TICKET);
    vi.spyOn(api, "fetchAttachments").mockResolvedValue([]);

    renderAtTicket(42);

    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("Battery drains much faster than usual.")).toBeInTheDocument();
    expect(screen.getByText("Not yet triaged")).toBeInTheDocument();
    expect(screen.getByText("No resolution summary available yet.")).toBeInTheDocument();
  });

  it("shows a safe not-found state when the ticket is not owned by the requester", async () => {
    vi.spyOn(api, "fetchTicket").mockRejectedValue(new Error("NOT_FOUND"));
    vi.spyOn(api, "fetchAttachments").mockResolvedValue([]);

    renderAtTicket(999);

    expect(
      await screen.findByText(/could not be found, or you do not have access/i)
    ).toBeInTheDocument();
  });

  it("shows a generic error state on an unexpected failure", async () => {
    vi.spyOn(api, "fetchTicket").mockRejectedValue(new Error("network down"));
    vi.spyOn(api, "fetchAttachments").mockResolvedValue([]);

    renderAtTicket(42);

    expect(await screen.findByText(/unable to load this ticket/i)).toBeInTheDocument();
  });

  it("passes loaded attachments through to the Attachments panel", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(MOCK_TICKET);
    vi.spyOn(api, "fetchAttachments").mockResolvedValue([
      {
        id: 1,
        ticketId: 42,
        originalFilename: "evidence.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
        isRemoved: false,
        removedAt: null,
        removalReason: null,
        uploadedAt: new Date().toISOString(),
      },
    ]);

    renderAtTicket(42);

    expect(await screen.findByText("evidence.pdf")).toBeInTheDocument();
  });
});