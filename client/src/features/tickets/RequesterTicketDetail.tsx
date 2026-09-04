import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchTicket, fetchAttachments, Ticket, Attachment } from "../../api";
import { useRequester } from "../../context/RequesterContext";
import AttachmentSection from "./AttachmentSection";
import RequesterBadge from "../requester/RequesterBadge";

type LoadState = "loading" | "success" | "not-found" | "error";

export default function RequesterTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const ticketId = Number(id);

  const loadAttachments = useCallback(async () => {
    if (!requester) return;
    try {
      const data = await fetchAttachments(requester.id, ticketId);
      setAttachments(data);
    } catch {
      // Non-fatal: the ticket header still loads even if attachments fail here.
    }
  }, [requester, ticketId]);

  useEffect(() => {
    if (!requester || !Number.isInteger(ticketId)) {
      setLoadState("not-found");
      return;
    }
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const t = await fetchTicket(requester!.id, ticketId);
        if (cancelled) return;
        setTicket(t);
        setLoadState("success");
        await loadAttachments();
      } catch (err) {
        if (cancelled) return;
        setLoadState(err instanceof Error && err.message === "NOT_FOUND" ? "not-found" : "error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requester, ticketId, loadAttachments]);

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
        <div className="alert alert-warning">
          This ticket could not be found, or you do not have access to it.
        </div>
        <button className="btn btn-outline-success" onClick={() => navigate("/my-tickets")}>
          Back to My Tickets
        </button>
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

  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      <Link to="/my-tickets" className="btn btn-outline-secondary btn-sm mb-3">
        ← Back to My Tickets
      </Link>

      <div className="mb-3">
        <RequesterBadge />
      </div>

      <div className="card">
        <div className="card-body">
          <h1 className="h4 mb-3">{ticket.ticketNumber}</h1>

          <div className="row g-3 mb-3">
            <ReadOnlyField label="Created Date" value={new Date(ticket.createdAt).toLocaleString()} />
            <ReadOnlyField label="Current Status" value={ticket.currentStatus} />
            <ReadOnlyField label="Requested Priority" value={ticket.requestedPriority} />
            <ReadOnlyField label="IT Priority" value={ticket.itPriority ?? "Not yet triaged"} />
          </div>

          <ReadOnlyField label="Summary" value={ticket.summary} block />
          <ReadOnlyField label="Description" value={ticket.description} block multiline />
          <ReadOnlyField
            label="Resolution Summary"
            value={ticket.resolutionSummary ?? "No resolution summary available yet."}
            block
          />
        </div>
      </div>

      <AttachmentSection
        requesterId={requester!.id}
        ticketId={ticketId}
        attachments={attachments}
        onAttachmentsChanged={loadAttachments}
      />
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  block,
  multiline,
}: {
  label: string;
  value: string;
  block?: boolean;
  multiline?: boolean;
}) {
  const content = (
    <div className="p-2 rounded" style={{ background: "#F1F0E8", border: "1px dashed #D8E2DC" }}>
      {multiline ? <div style={{ whiteSpace: "pre-wrap" }}>{value}</div> : value}
    </div>
  );

  if (block) {
    return (
      <div className="mb-3">
        <label className="form-label fw-semibold small text-muted">{label}</label>
        {content}
      </div>
    );
  }

  return (
    <div className="col-6 col-md-3">
      <label className="form-label fw-semibold small text-muted d-block">{label}</label>
      {content}
    </div>
  );
}