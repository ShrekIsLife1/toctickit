import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequesterSelection from "../../src/features/requester/RequesterSelection.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <RequesterProvider>
        <RequesterSelection />
      </RequesterProvider>
    </MemoryRouter>
  );
}

describe("RequesterSelection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state before requesters resolve", () => {
    vi.spyOn(api, "fetchRequesters").mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    expect(screen.getByText(/loading requesters/i)).toBeInTheDocument();
  });

  it("shows the dropdown once active requesters load", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
      { id: 2, name: "Michael Brown", email: "michael.brown@example.com" },
    ]);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByLabelText(/development requester/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
  });

  it("shows an empty state when no active requesters exist", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/no active development requesters/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the API call fails", async () => {
    vi.spyOn(api, "fetchRequesters").mockRejectedValue(new Error("network down"));
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/unable to load requesters/i)).toBeInTheDocument();
    });
  });

  it("disables Continue until a requester is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText(/development requester/i), {
      target: { value: "1" },
    });

    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });
});