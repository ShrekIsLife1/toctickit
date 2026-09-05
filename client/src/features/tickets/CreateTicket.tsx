import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  ApiFieldError,
  Category,
  RelatedSystem,
} from "../../api";
import { useRequester } from "../../context/RequesterContext";

type RefDataState = "loading" | "success" | "error";
type SubmitState = "idle" | "submitting" | "success" | "error";

export default function CreateTicket() {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [refDataState, setRefDataState] = useState<RefDataState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "">("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const [createdTicketNumber, setCreatedTicketNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRefDataState("loading");
      try {
        const [cats, systems] = await Promise.all([fetchCategories(), fetchRelatedSystems()]);
        if (cancelled) return;
        setCategories(cats);
        setRelatedSystems(systems);
        setRefDataState("success");
      } catch {
        if (!cancelled) setRefDataState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (summary.trim().length < 5 || summary.trim().length > 120) {
      errors.summary = "Summary must be 5-120 characters";
    }
    if (description.trim().length < 10 || description.trim().length > 2000) {
      errors.description = "Description must be 10-2000 characters";
    }
    if (!categoryId) errors.categoryId = "Category is required";
    if (!relatedSystemId) errors.relatedSystemId = "Related system is required";
    if (!requestedPriority) errors.requestedPriority = "Requested priority is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requester) return;
    if (!validate()) return;

    setSubmitState("submitting");
    setSubmitError("");

    try {
      const ticket = await createTicket(requester.id, {
        categoryId: categoryId as number,
        relatedSystemId: relatedSystemId as number,
        summary,
        description,
        requestedPriority: requestedPriority as "LOW" | "MEDIUM" | "HIGH",
      });
      setCreatedTicketNumber(ticket.ticketNumber);
      setSubmitState("success");
    } catch (err) {
      if (err instanceof ApiFieldError) {
        setFieldErrors(err.fields);
        setSubmitState("idle");
      } else {
        setSubmitError(err instanceof Error ? err.message : "Unknown error");
        setSubmitState("error");
      }
    }
  }

  if (submitState === "success") {
    return (
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <div className="alert alert-success">
          <h2 className="h5">Ticket created</h2>
          <p className="mb-0">
            Your official Ticket Number is <strong>{createdTicketNumber}</strong>.
          </p>
        </div>
        <button className="btn btn-outline-success me-2" onClick={() => navigate("/my-tickets")}>
          View My Tickets
        </button>
        <button
          className="btn btn-success"
          onClick={() => {
            setSummary("");
            setDescription("");
            setCategoryId("");
            setRelatedSystemId("");
            setRequestedPriority("");
            setFieldErrors({});
            setSubmitState("idle");
          }}
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      {refDataState === "loading" && <p className="text-muted">Loading form data…</p>}

      {refDataState === "error" && (
        <div className="alert alert-danger">
          Unable to load categories and related systems. Please check that the backend is running.
        </div>
      )}

      {submitState === "error" && (
        <div className="alert alert-danger" role="alert">
          {submitError}
        </div>
      )}

      {refDataState === "success" && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="category" className="form-label fw-semibold">
              Category *
            </label>
            <select
              id="category"
              className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <div className="invalid-feedback">{fieldErrors.categoryId}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="relatedSystem" className="form-label fw-semibold">
              Related System *
            </label>
            <select
              id="relatedSystem"
              className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => setRelatedSystemId(Number(e.target.value))}
            >
              <option value="" disabled>
                Select a related system…
              </option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.relatedSystemId && (
              <div className="invalid-feedback">{fieldErrors.relatedSystemId}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="requestedPriority" className="form-label fw-semibold">
              Requested Priority *
            </label>
            <select
              id="requestedPriority"
              className={`form-select ${fieldErrors.requestedPriority ? "is-invalid" : ""}`}
              value={requestedPriority}
              onChange={(e) => setRequestedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
            >
              <option value="" disabled>
                Select a priority…
              </option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            {fieldErrors.requestedPriority && (
              <div className="invalid-feedback">{fieldErrors.requestedPriority}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="summary" className="form-label fw-semibold">
              Summary *
            </label>
            <input
              id="summary"
              type="text"
              className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            {fieldErrors.summary && <div className="invalid-feedback">{fieldErrors.summary}</div>}
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="form-label fw-semibold">
              Description *
            </label>
            <textarea
              id="description"
              className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {fieldErrors.description && (
              <div className="invalid-feedback">{fieldErrors.description}</div>
            )}
          </div>

          {/* Attachments section will be added in Issue 9 */}

          <button
            type="submit"
            className="btn btn-success"
            disabled={submitState === "submitting"}
          >
            {submitState === "submitting" ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}