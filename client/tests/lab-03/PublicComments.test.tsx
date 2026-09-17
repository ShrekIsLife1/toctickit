import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicComments from "../../src/features/tickets/PublicComments.js";
import * as api from "../../src/api.js";

const MOCK_COMMENT = {
  id: 1,
  ticketId: 42,
  authorId: 1,
  authorName: "Jennifer Anderson",
  authorRole: "REQUESTER",
  content: "Thanks for the update.",
  visibility: "PUBLIC" as const,
  createdAt: new Date().toISOString(),
};

describe("PublicComments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when there are no comments", () => {
    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={() => {}} />);

    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("renders existing comments with author, role, and content", () => {
    render(<PublicComments ticketId={42} comments={[MOCK_COMMENT]} onCommentPosted={() => {}} />);

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("REQUESTER")).toBeInTheDocument();
    expect(screen.getByText("Thanks for the update.")).toBeInTheDocument();
  });

  it("disables Post Comment until text is entered", () => {
    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={() => {}} />);

    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/type your comment here/i), {
      target: { value: "New comment" },
    });

    expect(screen.getByRole("button", { name: /post comment/i })).toBeEnabled();
  });

  it("posts a comment and calls onCommentPosted on success", async () => {
    const postSpy = vi.spyOn(api, "postComment").mockResolvedValue(MOCK_COMMENT);
    const onCommentPosted = vi.fn();

    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={onCommentPosted} />);

    fireEvent.change(screen.getByPlaceholderText(/type your comment here/i), {
      target: { value: "New comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(42, "New comment", "PUBLIC");
      expect(onCommentPosted).toHaveBeenCalled();
    });
  });

  it("clears the input after a successful post", async () => {
    vi.spyOn(api, "postComment").mockResolvedValue(MOCK_COMMENT);

    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={() => {}} />);

    const input = screen.getByPlaceholderText(/type your comment here/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New comment" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("shows an error message when posting fails", async () => {
    vi.spyOn(api, "postComment").mockRejectedValue(new Error("Unable to post comment"));

    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/type your comment here/i), {
      target: { value: "New comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    expect(await screen.findByText(/unable to post comment/i)).toBeInTheDocument();
  });

  it("shows a busy state while posting", async () => {
    vi.spyOn(api, "postComment").mockReturnValue(new Promise(() => {}));

    render(<PublicComments ticketId={42} comments={[]} onCommentPosted={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/type your comment here/i), {
      target: { value: "New comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /posting/i })).toBeDisabled();
    });
  });
});