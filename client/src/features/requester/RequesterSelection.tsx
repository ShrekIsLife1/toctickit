import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRequesters, Requester } from "../../api";
import { useRequester } from "../../context/RequesterContext";

type LoadState = "loading" | "success" | "empty" | "error";

export default function RequesterSelection() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const { setRequester } = useRequester();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const data = await fetchRequesters();
        if (cancelled) return;
        setRequesters(data);
        setLoadState(data.length === 0 ? "empty" : "success");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleContinue() {
    const found = requesters.find((r) => r.id === selectedId);
    if (!found) return;
    setRequester(found);
    navigate("/my-tickets");
  }

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <div className="card shadow-sm border-0 p-4">
        <h1 className="h4 text-center mb-2">Select Development Requester</h1>
        <p className="text-muted text-center small mb-4">
          Choose a development requester to simulate the current requester
          context for Lab 2. This is for testing only and is not a login
          screen.
        </p>

        {loadState === "loading" && (
          <p className="text-center text-muted">Loading requesters…</p>
        )}

        {loadState === "error" && (
          <div className="alert alert-danger" role="alert">
            Unable to load requesters. Please check that the backend is
            running and try again.
          </div>
        )}

        {loadState === "empty" && (
          <div className="alert alert-warning" role="alert">
            No active development requesters are available. Please contact
            an administrator to seed at least one active requester.
          </div>
        )}

        {loadState === "success" && (
          <>
            <label htmlFor="requester-select" className="form-label fw-semibold">
              Development Requester *
            </label>
            <select
              id="requester-select"
              className="form-select mb-3"
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              <option value="" disabled>
                Choose a requester…
              </option>
              {requesters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <div className="alert alert-success small py-2" role="status">
              Only active development requesters are shown.
            </div>

            <button
              className="btn btn-success w-100 mt-2"
              onClick={handleContinue}
              disabled={selectedId === ""}
            >
              Continue →
            </button>
          </>
        )}
      </div>
    </div>
  );
}