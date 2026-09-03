import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateTicket from "../../src/features/tickets/CreateTicket.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

const MOCK_CATEGORIES = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Software" },
];
const MOCK_RELATED_SYSTEMS = [
  { id: 1, name: "Corporate Laptop" },
  { id: 2, name: "Email" },
];

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
      <CreateTicket />
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
  await waitFor(() => {
    expect(screen.getByLabelText(/^category/i)).toBeInTheDocument();
  });
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^category/i), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/requested priority/i), { target: { value: "MEDIUM" } });
  fireEvent.change(screen.getByLabelText(/^summary/i), {
    target: { value: "Laptop battery drains quickly" },
  });
  fireEvent.change(screen.getByLabelText(/^description/i), {
    target: { value: "Battery drains much faster than usual even when the system is idle." },
  });
}

describe("CreateTicket", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before reference data resolves", async () => {
    vi.spyOn(api, "fetchCategories").mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, "fetchRelatedSystems").mockReturnValue(new Promise(() => {}));

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

    expect(screen.getByText(/loading form data/i)).toBeInTheDocument();
  });

  it("blocks submission and shows field errors when required fields are empty", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_RELATED_SYSTEMS);
    const createSpy = vi.spyOn(api, "createTicket");

    await renderWithRequesterSelected();

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/summary must be/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("shows a busy state while submitting and disables the button", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_RELATED_SYSTEMS);
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise(() => {}));

    await renderWithRequesterSelected();
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    });
  });

  it("shows the generated ticket number on success", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_RELATED_SYSTEMS);
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Laptop battery drains quickly",
      description: "Battery drains much faster than usual even when the system is idle.",
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      ticketOwnerId: null,
      resolutionSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await renderWithRequesterSelected();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/TKT-2026-000001/)).toBeInTheDocument();
  });

  it("shows a safe error and preserves field values when the API call fails", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_RELATED_SYSTEMS);
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to create ticket"));

    await renderWithRequesterSelected();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/unable to create ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^summary/i)).toHaveValue("Laptop battery drains quickly");
  });

  it("shows field-level errors returned by the backend without losing entered values", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(MOCK_RELATED_SYSTEMS);
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new api.ApiFieldError("Invalid", { summary: "Summary must be 5-120 characters" })
    );

    await renderWithRequesterSelected();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(await screen.findByText(/summary must be 5-120 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toHaveValue(
      "Battery drains much faster than usual even when the system is idle."
    );
  });
});
