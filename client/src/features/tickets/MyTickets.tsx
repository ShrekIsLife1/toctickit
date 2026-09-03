import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickets, fetchCategories, Category, TicketListItem } from "../../api";
import { useRequester } from "../../context/RequesterContext";
import RequesterBadge from "../requester/RequesterBadge";

type LoadState = "loading" | "success" | "error";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-success-subtle text-success",
  MEDIUM: "bg-warning-subtle text-warning-emphasis",
  HIGH: "bg-danger-subtle text-danger",
};

export default function MyTickets() {
  const { requester } = useRequester();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!requester) return;
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const res = await fetchTickets(requester!.id, {
          search: search || undefined,
          categoryId: categoryId || undefined,
          requestedPriority: requestedPriority || undefined,
          currentStatus: currentStatus || undefined,
          sortBy,
          sortDir,
          page,
        });
        if (cancelled) return;
        setTickets(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setLoadState("success");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }

    const debounce = setTimeout(load, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [requester, search, categoryId, requestedPriority, currentStatus, sortBy, sortDir, page]);

  const hasActiveFilters = Boolean(search || categoryId || requestedPriority || currentStatus);

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setCurrentStatus("");
    setPage(1);
  }

  function toggleSort(field: "createdAt" | "updatedAt") {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <RequesterBadge />
        </div>
        <Link to="/create-ticket" className="btn btn-success">
          + Create Ticket
        </Link>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search by ticket number or summary…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value ? Number(e.target.value) : "");
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={requestedPriority}
            onChange={(e) => {
              setRequestedPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={currentStatus}
            onChange={(e) => {
              setCurrentStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>
        {hasActiveFilters && (
          <div className="col-6 col-md-2">
            <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {loadState === "loading" && <p className="text-muted">Loading tickets…</p>}

      {loadState === "error" && (
        <div className="alert alert-danger">
          Unable to load tickets. Please check that the backend is running.
        </div>
      )}

      {loadState === "success" && tickets.length === 0 && !hasActiveFilters && (
        <div className="alert alert-secondary text-center py-5">
          <p className="mb-3">You haven't created any tickets yet.</p>
          <Link to="/create-ticket" className="btn btn-success">
            Create Ticket
          </Link>
        </div>
      )}

      {loadState === "success" && tickets.length === 0 && hasActiveFilters && (
        <div className="alert alert-secondary text-center py-5">
          <p className="mb-3">No tickets match your filters.</p>
          <button className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {loadState === "success" && tickets.length > 0 && (
        <>
          <table className="table d-none d-md-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th role="button" onClick={() => toggleSort("createdAt")}>
                  Created Date {sortBy === "createdAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th>Summary</th>
                <th>Priority</th>
                <th>Status</th>
                <th role="button" onClick={() => toggleSort("updatedAt")}>
                  Last Updated {sortBy === "updatedAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.summary}</td>
                  <td>
                    <span className={`badge ${PRIORITY_BADGE[t.requestedPriority] ?? "bg-secondary"}`}>
                      {t.requestedPriority}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-info-subtle text-info-emphasis">{t.currentStatus}</span>
                  </td>
                  <td>{new Date(t.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-md-none">
            {tickets.map((t) => (
              <Link
                to={`/tickets/${t.id}`}
                key={t.id}
                className="card mb-2 p-3 text-decoration-none text-body"
              >
                <div className="d-flex justify-content-between">
                  <strong>{t.ticketNumber}</strong>
                  <span className="badge bg-info-subtle text-info-emphasis">{t.currentStatus}</span>
                </div>
                <div className="text-truncate my-1">{t.summary}</div>
                <div className="d-flex justify-content-between small text-muted">
                  <span className={`badge ${PRIORITY_BADGE[t.requestedPriority] ?? "bg-secondary"}`}>
                    {t.requestedPriority}
                  </span>
                  <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              Showing {tickets.length} of {total} tickets
            </span>
            <div>
              <button
                className="btn btn-outline-secondary btn-sm me-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="small">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm ms-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}