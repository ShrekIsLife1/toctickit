import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActionsTakenSection from "../../src/features/tickets/ActionsTakenSection.js";
import * as api from "../../src/api.js";
import * as authContext from "../../src/context/AuthContext.js";

const MOCK_STAFF_USER = {
  id: 2,
  name: "Kevin Patel",
  email: "kevin.patel@example.com",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const MOCK_REQUESTER_USER = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const MOCK_ACTIONS: api.ActionTaken[] = [
  {
    id: 1,
    ticketId: 42,
    actionDateTime: "2026-10-23T09:00:00.000Z",
    description: "Inspected hardware components.",
    result: "Found degraded capacitor on motherboard.",
    performedById: 2,
    performedBy: {
      id: 2,
      name: "Kevin Patel",
      email: "kevin.patel@example.com",
      role: "IT_STAFF",
    },
    followUpRequired: true,
    followUpNote: "Order replacement board.",
    attachmentNotes: "photo_cap.jpg",
    version: 1,
    createdAt: "2026-10-23T09:05:00.000Z",
    updatedAt: "2026-10-23T09:05:00.000Z",
    updatedById: null,
    updatedBy: null,
  },
  {
    id: 2,
    ticketId: 42,
    actionDateTime: "2026-10-23T14:30:00.000Z",
    description: "Installed replacement motherboard.",
    result: "Power cycle test passed 10/10 times.",
    performedById: 3,
    performedBy: {
      id: 3,
      name: "Lisa Martinez",
      email: "lisa.martinez@example.com",
      role: "IT_STAFF",
    },
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    version: 1,
    createdAt: "2026-10-23T14:40:00.000Z",
    updatedAt: "2026-10-23T14:40:00.000Z",
    updatedById: null,
    updatedBy: null,
  },
];

describe("UI-01 & UI-04: Actions Taken List Rendering (AC-01, AC-03, AC-06)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-01: Renders actions list with dates, staff members, results and stable order for staff", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValue(MOCK_ACTIONS);

    render(<ActionsTakenSection ticketId={42} readOnly={false} />);

    expect(screen.getByText(/loading actions taken/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("Inspected hardware components.")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Installed replacement motherboard.")[0]).toBeInTheDocument();
    });

    // Check staff names and roles
    expect(screen.getAllByText("Kevin Patel")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Lisa Martinez")[0]).toBeInTheDocument();

    // Check '+ Add Action' button and 'Edit' buttons are rendered for staff
    expect(screen.getByRole("button", { name: /\+ add action/i })).toBeInTheDocument();
    const editButtons = screen.getAllByRole("button", { name: /edit action/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("UI-04: Renders actions read-only for Requester without Add or Edit buttons", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_REQUESTER_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValue(MOCK_ACTIONS);

    render(<ActionsTakenSection ticketId={42} readOnly={true} />);

    await waitFor(() => {
      expect(screen.getAllByText("Inspected hardware components.")[0]).toBeInTheDocument();
    });

    // Verify neither Add Action nor Edit buttons are rendered
    expect(screen.queryByRole("button", { name: /\+ add action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit action/i })).not.toBeInTheDocument();
  });
});

describe("UI-02: Actions Taken Form Validation & Creation (AC-04, FR-06)", () => {
  beforeEach(() => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires follow-up note when followUpRequired is toggled on", async () => {
    const createSpy = vi.spyOn(api, "createActionTaken").mockResolvedValue(MOCK_ACTIONS[0]);

    render(<ActionsTakenSection ticketId={42} readOnly={false} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ add action/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ add action/i }));

    // Form inputs
    const descInput = screen.getByPlaceholderText(/detail the work carried out/i);
    const resInput = screen.getByPlaceholderText(/state the observed outcome/i);
    const followUpSwitch = screen.getByLabelText(/follow-up required\?/i);

    fireEvent.change(descInput, { target: { value: "Replaced fuse" } });
    fireEvent.change(resInput, { target: { value: "Power restored" } });
    fireEvent.click(followUpSwitch);

    // Try to submit without followUpNote
    const submitBtn = screen.getByRole("button", { name: /save action/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/follow-up note is required/i)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    // Fill follow-up note and submit
    const noteInput = screen.getByPlaceholderText(/describe necessary next steps/i);
    fireEvent.change(noteInput, { target: { value: "Check fuse ratings tomorrow." } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(42, expect.objectContaining({
        description: "Replaced fuse",
        result: "Power restored",
        followUpRequired: true,
        followUpNote: "Check fuse ratings tomorrow.",
      }));
    });
  });

  it("preserves form values when submission fails", async () => {
    vi.spyOn(api, "createActionTaken").mockRejectedValue(new Error("Network timeout"));

    render(<ActionsTakenSection ticketId={42} readOnly={false} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ add action/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ add action/i }));

    const descInput = screen.getByPlaceholderText(/detail the work carried out/i);
    const resInput = screen.getByPlaceholderText(/state the observed outcome/i);

    fireEvent.change(descInput, { target: { value: "Carefully written description" } });
    fireEvent.change(resInput, { target: { value: "Specific outcome" } });

    fireEvent.click(screen.getByRole("button", { name: /save action/i }));

    await waitFor(() => {
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
    });

    // Inputs must be preserved
    expect(screen.getByDisplayValue("Carefully written description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Specific outcome")).toBeInTheDocument();
  });
});

describe("UI-03: Actions Taken Edit Mode & Concurrency (AC-07)", () => {
  beforeEach(() => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      user: MOCK_STAFF_USER,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValue([MOCK_ACTIONS[0]]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pre-fills existing data in edit mode and shows conflict banner on 409 STALE_UPDATE", async () => {
    vi.spyOn(api, "updateActionTaken").mockRejectedValue(
      new api.ApiError(
        "This Action Taken has been modified by another user. Please reload the latest version.",
        "STALE_UPDATE",
        { currentVersion: 2 }
      )
    );

    render(<ActionsTakenSection ticketId={42} readOnly={false} />);
    await waitFor(() => {
      expect(screen.getAllByText("Inspected hardware components.")[0]).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: /edit action/i });
    fireEvent.click(editButtons[0]);

    // Check pre-filled values
    expect(screen.getByDisplayValue("Inspected hardware components.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Found degraded capacitor on motherboard.")).toBeInTheDocument();

    // Modify and submit
    const submitBtn = screen.getByRole("button", { name: /update action/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/modified by another user/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reload actions/i })).toBeInTheDocument();
    });
  });
});
