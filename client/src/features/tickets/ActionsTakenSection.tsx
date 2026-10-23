import React, { useState, useEffect, useCallback } from "react";
import {
  ActionTaken,
  fetchActionsTaken,
  createActionTaken,
  updateActionTaken,
  ApiError,
} from "../../api";
import { useAuth } from "../../context/AuthContext";

interface ActionsTakenSectionProps {
  ticketId: number;
  readOnly?: boolean;
  ticketStatus?: string;
  onActionChanged?: () => void;
}

function toLocalIsoString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ActionsTakenSection({
  ticketId,
  readOnly = false,
  ticketStatus,
  onActionChanged,
}: ActionsTakenSectionProps) {
  const { user } = useAuth();
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form mode: "list" | "create" | "edit"
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);

  // Form fields
  const [actionDateTime, setActionDateTime] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isStaleConflict, setIsStaleConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isCancelled = ticketStatus === "CANCELLED";

  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActionsTaken(ticketId);
      setActions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load actions taken.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  function startCreateMode() {
    setMode("create");
    setEditingAction(null);
    setActionDateTime(toLocalIsoString(new Date()));
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFormError(null);
    setIsStaleConflict(false);
  }

  function startEditMode(action: ActionTaken) {
    setMode("edit");
    setEditingAction(action);
    setActionDateTime(toLocalIsoString(new Date(action.actionDateTime)));
    setDescription(action.description);
    setResult(action.result);
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || "");
    setAttachmentNotes(action.attachmentNotes || "");
    setFormError(null);
    setIsStaleConflict(false);
  }

  function cancelForm() {
    setMode("list");
    setEditingAction(null);
    setFormError(null);
    setIsStaleConflict(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsStaleConflict(false);

    // Client-side validations (AC-04, UNIT-03)
    if (!description.trim()) {
      setFormError("Action description is required.");
      return;
    }
    if (description.trim().length > 2000) {
      setFormError("Action description cannot exceed 2000 characters.");
      return;
    }
    if (!result.trim()) {
      setFormError("Result is required.");
      return;
    }
    if (result.trim().length > 1000) {
      setFormError("Result cannot exceed 1000 characters.");
      return;
    }
    if (followUpRequired && !followUpNote.trim()) {
      setFormError("Follow-up note is required when follow-up is requested.");
      return;
    }
    if (followUpNote.trim().length > 1000) {
      setFormError("Follow-up note cannot exceed 1000 characters.");
      return;
    }
    if (attachmentNotes.trim().length > 500) {
      setFormError("Attachment notes cannot exceed 500 characters.");
      return;
    }

    if (actionDateTime) {
      const parsedDate = new Date(actionDateTime);
      if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) {
        setFormError("Action date/time cannot be more than 5 minutes in the future.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        actionDateTime: actionDateTime ? new Date(actionDateTime).toISOString() : undefined,
        description: description.trim(),
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
      };

      if (mode === "create") {
        await createActionTaken(ticketId, payload);
      } else if (mode === "edit" && editingAction) {
        await updateActionTaken(ticketId, editingAction.id, {
          expectedVersion: editingAction.version,
          ...payload,
        });
      }

      await loadActions();
      onActionChanged?.();
      setMode("list");
      setEditingAction(null);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "STALE_UPDATE") {
          setIsStaleConflict(true);
          setFormError("This Action Taken has been modified by another user. Please reload the latest version.");
        } else {
          setFormError(err.message || "Unable to save Action Taken.");
        }
      } else {
        setFormError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card mt-4 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
      <div className="card-header d-flex justify-content-between align-items-center bg-white py-3">
        <div className="d-flex align-items-center gap-2">
          <h2 className="h5 mb-0 fw-bold" style={{ color: "var(--color-text)" }}>
            Actions Taken
          </h2>
          <span className="badge rounded-pill" style={{ background: "var(--color-pale-green)", color: "var(--color-secondary)" }}>
            {actions.length}
          </span>
        </div>
        {!readOnly && mode === "list" && (
          <button
            className="btn btn-sm btn-zen-primary"
            onClick={startCreateMode}
            disabled={isCancelled}
            title={isCancelled ? "Actions cannot be added to Cancelled tickets." : undefined}
          >
            + Add Action
          </button>
        )}
      </div>

      <div className="card-body p-3">
        {loading && <div className="text-muted small py-3">Loading actions taken…</div>}
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* List View */}
        {!loading && !error && mode === "list" && (
          <>
            {actions.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <p className="mb-1">
                  {readOnly
                    ? "No actions have been recorded yet for this ticket."
                    : "No actions have been recorded yet for this ticket."}
                </p>
                {!readOnly && !isCancelled && (
                  <button className="btn btn-sm btn-outline-success mt-2" onClick={startCreateMode}>
                    + Add First Action
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="d-none d-md-block table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th style={{ width: "16%" }}>Date / Time</th>
                        <th style={{ width: "16%" }}>Performed By</th>
                        <th style={{ width: "26%" }}>Description</th>
                        <th style={{ width: "22%" }}>Result</th>
                        <th style={{ width: "10%" }}>Follow-up</th>
                        {!readOnly && <th style={{ width: "10%" }} className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="small">
                      {actions.map((act) => (
                        <tr key={act.id}>
                          <td>
                            <span className="fw-semibold">
                              {new Date(act.actionDateTime).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td>
                            <div className="fw-medium">{act.performedBy?.name || "Unknown"}</div>
                            <span className="badge bg-light text-muted border" style={{ fontSize: "0.75rem" }}>
                              {act.performedBy?.role || "STAFF"}
                            </span>
                          </td>
                          <td>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {act.description}
                            </div>
                            {act.attachmentNotes && (
                              <div className="text-muted mt-1" style={{ fontSize: "0.8rem" }}>
                                📎 <span className="fst-italic">{act.attachmentNotes}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {act.result}
                            </div>
                          </td>
                          <td>
                            {act.followUpRequired ? (
                              <div>
                                <span className="badge bg-warning text-dark">Yes</span>
                                {act.followUpNote && (
                                  <div className="text-muted mt-1" style={{ fontSize: "0.8rem" }}>
                                    {act.followUpNote}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="badge bg-light text-muted border">No</span>
                            )}
                          </td>
                          {!readOnly && (
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => startEditMode(act)}
                                disabled={isCancelled}
                                aria-label={`Edit action from ${new Date(act.actionDateTime).toLocaleDateString()}`}
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="d-md-none d-flex flex-column gap-3">
                  {actions.map((act) => (
                    <div key={act.id} className="card p-3 border shadow-sm">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold small">
                            {new Date(act.actionDateTime).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-muted small">
                            {act.performedBy?.name} ({act.performedBy?.role})
                          </div>
                        </div>
                        {!readOnly && !isCancelled && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => startEditMode(act)}
                            aria-label="Edit action"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      <div className="mb-2">
                        <div className="text-muted small fw-semibold">Description:</div>
                        <div className="small" style={{ whiteSpace: "pre-wrap" }}>{act.description}</div>
                      </div>

                      <div className="mb-2">
                        <div className="text-muted small fw-semibold">Result:</div>
                        <div className="small" style={{ whiteSpace: "pre-wrap" }}>{act.result}</div>
                      </div>

                      {act.followUpRequired && (
                        <div className="p-2 rounded mb-2" style={{ background: "#FFFBEB", borderLeft: "3px solid #D97706" }}>
                          <span className="badge bg-warning text-dark me-2">Follow-up Required</span>
                          <span className="small text-dark">{act.followUpNote}</span>
                        </div>
                      )}

                      {act.attachmentNotes && (
                        <div className="text-muted small fst-italic">
                          📎 Notes: {act.attachmentNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Create / Edit Form Mode */}
        {(mode === "create" || mode === "edit") && (
          <form onSubmit={handleSubmit} noValidate className="p-2 border rounded bg-light">
            <h3 className="h6 fw-bold mb-3">
              {mode === "create" ? "Record New Action Taken" : "Edit Action Taken"}
            </h3>

            {formError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {formError}
                {isStaleConflict && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger d-block mt-2"
                    onClick={() => {
                      loadActions();
                      cancelForm();
                    }}
                  >
                    Reload Actions
                  </button>
                )}
              </div>
            )}

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold">Action Date / Time</label>
                <input
                  type="datetime-local"
                  className="form-control form-control-sm"
                  value={actionDateTime}
                  onChange={(e) => setActionDateTime(e.target.value)}
                  disabled={submitting}
                />
                <div className="form-text" style={{ fontSize: "0.75rem" }}>
                  Defaults to current time. Cannot exceed 5 minutes in future.
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold">Performed by</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-light"
                  value={`${user?.name || "Current User"} (auto)`}
                  disabled
                  readOnly
                />
                <div className="form-text" style={{ fontSize: "0.75rem" }}>
                  Automatically attributed to authenticated session.
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-semibold">
                  Action Description <span className="text-danger">*</span>
                </label>
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {description.length}/2000
                </span>
              </div>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                placeholder="Detail the work carried out, diagnostics performed, or components replaced..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                disabled={submitting}
                required
              />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-semibold">
                  Result <span className="text-danger">*</span>
                </label>
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {result.length}/1000
                </span>
              </div>
              <textarea
                className="form-control form-control-sm"
                rows={2}
                placeholder="State the observed outcome or verification result..."
                value={result}
                onChange={(e) => setResult(e.target.value)}
                maxLength={1000}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="followUpSwitch"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                disabled={submitting}
              />
              <label className="form-check-label small fw-semibold" htmlFor="followUpSwitch">
                Follow-up Required?
              </label>
            </div>

            {followUpRequired && (
              <div className="mb-3 p-3 rounded" style={{ background: "#FEF9C3", border: "1px solid #FDE047" }}>
                <div className="d-flex justify-content-between">
                  <label className="form-label small fw-semibold text-dark">
                    Follow-up Note <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                    {followUpNote.length}/1000
                  </span>
                </div>
                <textarea
                  className="form-control form-control-sm bg-white"
                  rows={2}
                  placeholder="Describe necessary next steps, schedule, or assignee notes..."
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  maxLength={1000}
                  disabled={submitting}
                  required
                />
              </div>
            )}

            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <label className="form-label small fw-semibold">Attachment Notes (optional)</label>
                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {attachmentNotes.length}/500
                </span>
              </div>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Look at diag_output.log on network share or battery_report.pdf"
                value={attachmentNotes}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                maxLength={500}
                disabled={submitting}
              />
              <div className="form-text" style={{ fontSize: "0.75rem" }}>
                Informational reference note only, not a file upload.
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={cancelForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-zen-primary"
                disabled={submitting}
              >
                {submitting ? "Saving…" : mode === "create" ? "Save Action" : "Update Action"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
