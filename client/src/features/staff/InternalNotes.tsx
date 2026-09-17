import { useState } from "react";
import { Comment, postComment } from "../../api";

interface Props {
  ticketId: number;
  notes: Comment[];
  onNotePosted: () => void;
}

export default function InternalNotes({ ticketId, notes, onNotePosted }: Props) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postComment(ticketId, content.trim(), "INTERNAL");
      setContent("");
      onNotePosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post note");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="card mt-4"
      style={{ background: "var(--color-readonly-bg)", borderLeft: "4px solid var(--color-warning)" }}
    >
      <div className="card-body">
        <h2 className="h5 mb-1">🔒 Internal Notes</h2>
        <p className="text-muted small mb-3">Visible only to IT Staff and Administrators.</p>

        <div className="d-flex gap-2 mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Type an internal note…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={posting}
          />
          <button
            className="btn btn-zen-primary"
            onClick={handlePost}
            disabled={posting || !content.trim()}
          >
            {posting ? "Posting…" : "Post Note"}
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {notes.length === 0 ? (
          <p className="text-muted">No internal notes yet.</p>
        ) : (
          <ul className="list-unstyled">
            {notes.map((n) => (
              <li key={n.id} className="mb-3 pb-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{n.authorName}</strong>{" "}
                    <span className="badge bg-secondary ms-1">{n.authorRole}</span>
                  </div>
                  <span className="text-muted small">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="mb-0 mt-1">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}