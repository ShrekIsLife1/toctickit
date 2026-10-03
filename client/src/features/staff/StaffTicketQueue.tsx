import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStaffTickets, claimTicket, fetchCategories, Category, StaffTicketListItem } from "../../api";
import { useAuth } from "../../context/AuthContext";

type LoadState = "loading" | "success" | "error";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "badge-zen-low",
  MEDIUM: "badge-zen-medium",
  HIGH: "badge-zen-high",
};

export default function StaffTicketQueue() {
  const { user } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<StaffTicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");
  const [ticketOwnerFilter, setTicketOwnerFilter] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function load() {
    setLoadState("loading");
    try {
      const res = await fetchStaffTickets({
        search: search || undefined,
        categoryId: categoryId || undefined,
        requestedPriority: requestedPriority || undefined,
        itPriority: itPriority || undefined,
        currentStatus: currentStatus || undefined,
        ticketOwnerId: ticketOwnerFilter === "unassigned" ? "unassigned" : undefined,
        sortBy,
        sortDir,
        page,
      });
      setTickets(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setLoadState("success");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, requestedPriority, itPriority, currentStatus, ticketOwnerFilter, sortBy, sortDir, page]);

  const hasActiveFilters = Boolean(
    search || categoryId || requestedPriority || itPriority || currentStatus || ticketOwnerFilter
  );

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setCurrentStatus("");
    setTicketOwnerFilter("");
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

  async function handleClaim(ticketId: number) {
    if (!user) return;
    setClaimingId(ticketId);
    try {
      await claimTicket(ticketId, user.id);
      await load();
    } catch {
      // Non-fatal: row stays as-is, staff can retry
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="container py-5">
      <h1 className="h3 mb-3">Ticket Queue</h1>

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
            value={itPriority}
            onChange={(e) => {
              setItPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All IT Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <select
            className="form-select"
            value={ticketOwnerFilter}
            onChange={(e) => {
              setTicketOwnerFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Owners</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        {hasActiveFilters && (
          <div className="col-6 col-md-2">
            <button className="btn btn-zen-secondary w-100" onClick={clearFilters}>
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

      {loadState === "success" && tickets.length === 0 && (
        <div className="alert alert-secondary text-center py-5">
          {hasActiveFilters ? "No tickets match your filters." : "No tickets in the queue."}
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
                <th>Req. Priority</th>
                <th>IT Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th role="button" onClick={() => toggleSort("updatedAt")}>
                  Last Updated {sortBy === "updatedAt" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/staff/tickets/${t.id}`}>{t.ticketNumber}</Link>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.summary}</td>
                  <td>
                    <span className={`badge ${PRIORITY_BADGE[t.requestedPriority] ?? "bg-secondary"}`}>
                      {t.requestedPriority}
                    </span>
                  </td>
                  <td>
                    {t.itPriority ? (
                      <span className={`badge ${PRIORITY_BADGE[t.itPriority] ?? "bg-secondary"}`}>
                        {t.itPriority}
                      </span>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-zen-status">{t.currentStatus}</span>
                  </td>
                  <td>
                    {t.ticketOwnerName ? (
                      t.ticketOwnerName
                    ) : (
                      <button
                        className="btn btn-zen-primary btn-sm"
                        onClick={() => handleClaim(t.id)}
                        disabled={claimingId === t.id}
                      >
                        {claimingId === t.id ? "Claiming…" : "Claim"}
                      </button>
                    )}
                  </td>
                  <td>{new Date(t.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-md-none">
            {tickets.map((t) => (
              <div key={t.id} className="card mb-2 p-3">
                <Link to={`/staff/tickets/${t.id}`} className="text-decoration-none text-body">
                  <div className="d-flex justify-content-between">
                    <strong>{t.ticketNumber}</strong>
                    <span className="badge badge-zen-status">{t.currentStatus}</span>
                  </div>
                  <div className="text-truncate my-1">{t.summary}</div>
                </Link>
                <div className="d-flex justify-content-between align-items-center small text-muted">
                  <span className={`badge ${PRIORITY_BADGE[t.requestedPriority] ?? "bg-secondary"}`}>
                    {t.requestedPriority}
                  </span>
                  {t.ticketOwnerName ? (
                    <span>{t.ticketOwnerName}</span>
                  ) : (
                    <button
                      className="btn btn-zen-primary btn-sm"
                      onClick={() => handleClaim(t.id)}
                      disabled={claimingId === t.id}
                    >
                      {claimingId === t.id ? "Claiming…" : "Claim"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              Showing {tickets.length} of {total} tickets
            </span>
            <div>
              <button
                className="btn btn-zen-secondary btn-sm me-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="small">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-zen-secondary btn-sm ms-2"
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