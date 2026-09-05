import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttachmentSection from "../../src/features/tickets/AttachmentSection.js";
import * as api from "../../src/api.js";

const ACTIVE_ATTACHMENT = {
  id: 1,
  ticketId: 10,
  originalFilename: "report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 100000,
  isRemoved: false,
  removedAt: null,
  removalReason: null,
  uploadedAt: new Date().toISOString(),
};

const REMOVED_ATTACHMENT = {
  id: 2,
  ticketId: 10,
  originalFilename: "old-screenshot.png",
  mimeType: "image/png",
  sizeBytes: 50000,
  isRemoved: true,
  removedAt: new Date().toISOString(),
  removalReason: "Wrong file, replaced",
  uploadedAt: new Date().toISOString(),
};

describe("AttachmentSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an active attachment with Download and Remove actions", () => {
    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[ACTIVE_ATTACHMENT]}
        onAttachmentsChanged={() => {}}
      />
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("renders a removed attachment as disabled metadata with its reason", () => {
    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[REMOVED_ATTACHMENT]}
        onAttachmentsChanged={() => {}}
      />
    );

    expect(screen.getByText("old-screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/removed/i)).toBeInTheDocument();
    expect(screen.getByText(/wrong file, replaced/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });

  it("calls onAttachmentsChanged after a successful upload", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachment").mockResolvedValue(ACTIVE_ATTACHMENT);
    const onChanged = vi.fn();

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[]}
        onAttachmentsChanged={onChanged}
      />
    );

    const file = new File(["dummy content"], "invoice.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(1, 10, file);
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("shows a client-side error for a disallowed file type without calling the API", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachment");

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[]}
        onAttachmentsChanged={() => {}}
      />
    );

    const file = new File(["dummy content"], "virus.exe", { type: "application/x-msdownload" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/only jpg, png, webp, and pdf/i)).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("blocks upload when 5 active attachments already exist", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachment");
    const fiveAttachments = Array.from({ length: 5 }, (_, i) => ({
      ...ACTIVE_ATTACHMENT,
      id: i + 1,
      originalFilename: `file-${i}.pdf`,
    }));

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={fiveAttachments}
        onAttachmentsChanged={() => {}}
      />
    );

    expect(screen.getByText(/5 of 5 slots used/i)).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("requires a removal reason before enabling Confirm", async () => {
    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[ACTIVE_ATTACHMENT]}
        onAttachmentsChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/removal reason/i), {
      target: { value: "Duplicate file" },
    });

    expect(confirmButton).toBeEnabled();
  });

  it("calls onAttachmentsChanged after a successful soft removal", async () => {
    vi.spyOn(api, "removeAttachment").mockResolvedValue({ ...ACTIVE_ATTACHMENT, isRemoved: true });
    const onChanged = vi.fn();

    render(
      <AttachmentSection
        requesterId={1}
        ticketId={10}
        attachments={[ACTIVE_ATTACHMENT]}
        onAttachmentsChanged={onChanged}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));
    fireEvent.change(screen.getByPlaceholderText(/removal reason/i), {
      target: { value: "Duplicate file" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalled();
    });
  });
});