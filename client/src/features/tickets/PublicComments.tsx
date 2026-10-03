import { useState } from "react";
import { Comment, postComment } from "../../api";

interface Props {
  ticketId: number;
  comments: Comment[];
  onCommentPosted: () => void;
}

export default function PublicComments({ ticketId, comments, onCommentPosted }: Props) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      await postComment(ticketId, content.trim(), "PUBLIC");
      setContent("");
      onCommentPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="card mt-4">
      <div className="card-body">
        <h2 className="h5 mb-3">Public Comments</h2>

        <div className="d-flex gap-2 mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Type your comment here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={posting}
          />
          <button
            className="btn btn-zen-primary"
            onClick={handlePost}
            disabled={posting || !content.trim()}
          >
            {posting ? "Posting…" : "Post Comment"}
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {comments.length === 0 ? (
          <p className="text-muted">No comments yet.</p>
        ) : (
          <ul className="list-unstyled">
            {comments.map((c) => (
              <li key={c.id} className="mb-3 pb-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{c.authorName}</strong>{" "}
                    <span className="badge bg-secondary ms-1">{c.authorRole}</span>
                  </div>
                  <span className="text-muted small">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mb-0 mt-1">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}