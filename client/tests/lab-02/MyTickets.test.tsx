import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/features/tickets/MyTickets.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const MOCK_TICKET = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  categoryId: 1,
  requestedPriority: "MEDIUM",
  currentStatus: "NEW",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function Harness() {
  const { setRequester } = useRequester();
  return (
    <>
      <button
        onClick={() =>
          setRequester({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" })
        }
      >
        select-requester
      </button>
      <MyTickets />
    </>
  );
}

async function renderWithRequesterSelected() {
  render(
    <MemoryRouter>
      <RequesterProvider>
        <Harness />
      </RequesterProvider>
    </MemoryRouter>
  );
  act(() => {
    fireEvent.click(screen.getByText("select-requester"));
  });
}

describe("MyTickets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty state when the requester has zero tickets", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });

    await renderWithRequesterSelected();

    expect(await screen.findByText(/haven't created any tickets/i)).toBeInTheDocument();
  });

  it("shows the no-results state when filters match nothing but tickets exist", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    const fetchSpy = vi
      .spyOn(api, "fetchTickets")
      .mockResolvedValueOnce({
        data: [MOCK_TICKET],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      });

    await renderWithRequesterSelected();
    await screen.findAllByText("Laptop battery drains quickly");
    fireEvent.change(screen.getByPlaceholderText(/search by ticket number/i), {
      target: { value: "nonexistent" },
    });

    await waitFor(
      () => {
        expect(screen.getByText(/no tickets match your filters/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("renders the ticket list on success", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [MOCK_TICKET],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    await renderWithRequesterSelected();

    expect((await screen.findAllByText("TKT-2026-000001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThan(0);
  });

  it("shows an error state when the API call fails", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("network down"));

    await renderWithRequesterSelected();

    expect(await screen.findByText(/unable to load tickets/i)).toBeInTheDocument();
  });

  it("triggers a refetch with the search query param when typing in the search box", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [MOCK_TICKET],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    await renderWithRequesterSelected();
    await screen.findAllByText("TKT-2026-000001");
    fireEvent.change(screen.getByPlaceholderText(/search by ticket number/i), {
      target: { value: "VPN" },
    });

    await waitFor(
      () => {
        const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
        expect(lastCall[1]).toMatchObject({ search: "VPN" });
      },
      { timeout: 1000 }
    );
  });
});