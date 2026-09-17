import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchStaffTicket,
  fetchStaffAttachments,
  fetchComments,
  updateStaffTicket,
  claimTicket,
  StaffTicketDetail as StaffTicketDetailType,
  Attachment,
  Comment,
} from "../../api";
import { useAuth } from "../../context/AuthContext";
import AttachmentSection from "../tickets/AttachmentSection";
import PublicComments from "../tickets/PublicComments";
import InternalNotes from "./InternalNotes";

type LoadState = "loading" | "success" | "not-found" | "error";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CANCELLED: [],
};

export default function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ticketId = Number(id);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [publicComments, setPublicComments] = useState<Comment[]>([]);
  const [internalNotes, setInternalNotes] = useState<Comment[]>([]);
  const [savingField, setSavingField] = useState<"itPriority" | "status" | "claim" | null>(null);
  const [saveError, setSaveError] = useState("");

  const loadAttachments = useCallback(async () => {
    try {
      setAttachments(await fetchStaffAttachments(ticketId));
    } catch {
      // non-fatal
    }
  }, [ticketId]);

  const loadComments = useCallback(async () => {
    try {
      const all = await fetchComments(ticketId);
      setPublicComments(all.filter((c) => c.visibility === "PUBLIC"));
      setInternalNotes(all.filter((c) => c.visibility === "INTERNAL"));
    } catch {
      // non-fatal
    }
  }, [ticketId]);

  useEffect(() => {
    if (!Number.isInteger(ticketId)) {
      setLoadState("not-found");
      return;
    }
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const t = await fetchStaffTicket(ticketId);
        if (cancelled) return;
        setTicket(t);
        setLoadState("success");
        await Promise.all([loadAttachments(), loadComments()]);
      } catch (err) {
        if (cancelled) return;
        setLoadState(err instanceof Error && err.message === "NOT_FOUND" ? "not-found" : "error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticketId, loadAttachments, loadComments]);

  async function handleItPriorityChange(value: string) {
    if (!ticket) return;
    setSavingField("itPriority");
    setSaveError("");
    try {
      const updated = await updateStaffTicket(ticketId, { itPriority: value });
      setTicket(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update IT Priority");
    } finally {
      setSavingField(null);
    }
  }

  async function handleStatusChange(value: string) {
    if (!ticket) return;
    setSavingField("status");
    setSaveError("");
    try {
      const updated = await updateStaffTicket(ticketId, { currentStatus: value });
      setTicket(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setSavingField(null);
    }
  }

  async function handleClaim() {
    if (!user || !ticket) return;
    setSavingField("claim");
    setSaveError("");
    try {
      await claimTicket(ticketId, user.id);
      const refreshed = await fetchStaffTicket(ticketId);
      setTicket(refreshed);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to claim ticket");
    } finally {
      setSavingField(null);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="container py-5">
        <p className="text-muted">Loading ticket…</p>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">This ticket could not be found.</div>
        <Link to="/staff/queue" className="btn btn-zen-secondary">
          Back to Queue
        </Link>
      </div>
    );
  }

  if (loadState === "error" || !ticket) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Unable to load this ticket. Please try again.</div>
      </div>
    );
  }

  const permittedStatuses = STATUS_TRANSITIONS[ticket.currentStatus] ?? [];

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <Link to="/staff/queue" className="btn btn-zen-secondary btn-sm mb-3">
        ← Back to Queue
      </Link>

      <div className="card">
        <div className="card-body">
          <h1 className="h4 mb-3">{ticket.ticketNumber}</h1>

          <div className="row g-3 mb-3">
            <ReadOnly label="Requester" value={ticket.requesterName} />
            <ReadOnly label="Requested Priority" value={ticket.requestedPriority} />
            <div className="col-6 col-md-3">
              <label className="form-label fw-semibold small text-muted">IT Priority</label>
              <select
                className="form-select"
                value={ticket.itPriority ?? ""}
                onChange={(e) => handleItPriorityChange(e.target.value)}
                disabled={savingField === "itPriority"}
              >
                <option value="" disabled>
                  Not yet triaged
                </option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label fw-semibold small text-muted">Current Status</label>
              <select
                className="form-select"
                value={ticket.currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={savingField === "status" || permittedStatuses.length === 0}
              >
                <option value={ticket.currentStatus}>{ticket.currentStatus}</option>
                {permittedStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-muted">Ticket Owner</label>
              {ticket.ticketOwnerName ? (
                <div className="p-2 rounded" style={{ background: "#F1F0E8" }}>
                  {ticket.ticketOwnerName}
                </div>
              ) : (
                <button
                  className="btn btn-zen-primary btn-sm"
                  onClick={handleClaim}
                  disabled={savingField === "claim"}
                >
                  {savingField === "claim" ? "Claiming…" : "Claim this Ticket"}
                </button>
              )}
            </div>
          </div>

          {saveError && <div className="alert alert-danger py-2 small">{saveError}</div>}
          {ticket.problemAppearsResolved && (
            <div className="alert alert-success py-2 small">
              The Requester has indicated this problem appears resolved.
            </div>
          )}

          <ReadOnlyBlock label="Summary" value={ticket.summary} />
          <ReadOnlyBlock label="Description" value={ticket.description} multiline />
        </div>
      </div>

      <AttachmentSection
        requesterId={ticket.requesterId}
        ticketId={ticketId}
        attachments={attachments}
        onAttachmentsChanged={loadAttachments}
      />

      <PublicComments ticketId={ticketId} comments={publicComments} onCommentPosted={loadComments} />
      <InternalNotes ticketId={ticketId} notes={internalNotes} onNotePosted={loadComments} />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-6 col-md-3">
      <label className="form-label fw-semibold small text-muted d-block">{label}</label>
      <div className="p-2 rounded" style={{ background: "#F1F0E8", border: "1px dashed #D8E2DC" }}>
        {value}
      </div>
    </div>
  );
}

function ReadOnlyBlock({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold small text-muted">{label}</label>
      <div className="p-2 rounded" style={{ background: "#F1F0E8", border: "1px dashed #D8E2DC" }}>
        {multiline ? <div style={{ whiteSpace: "pre-wrap" }}>{value}</div> : value}
      </div>
    </div>
  );
}