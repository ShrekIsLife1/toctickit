import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchStaffDashboard, StaffDashboardData } from "../../api";

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetchStaffDashboard();
      setData(res);
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Staff Member";

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>, targetUrl: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(targetUrl);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1E3A2F" }}>
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted mb-0 small">
            Here's what's happening with your queue today.
            {lastUpdated && <span className="ms-2">Last updated: {lastUpdated}</span>}
          </p>
        </div>
        <button
          className="btn btn-zen-secondary btn-sm d-flex align-items-center gap-1"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          aria-label="Refresh dashboard metrics"
        >
          <span className={refreshing ? "spinner-border spinner-border-sm me-1" : "me-1"}>
            {!refreshing && "🔄"}
          </span>
          Refresh
        </button>
      </div>

      {/* Safe Error Alert Banner */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={() => loadData(false)}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />
          <p className="text-muted mt-2">Loading queue metrics…</p>
        </div>
      ) : (
        data && (
          <>
            {/* Operational Queue Metric Cards */}
            <div className="row g-3 mb-4">
              {/* Unassigned */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Unassigned Tickets: ${data.unassigned}. Press to view.`}
                  onClick={() => navigate("/staff/queue?owner=unassigned")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?owner=unassigned")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">Unassigned</span>
                  <div className="fs-3 fw-bold text-danger my-1">{data.unassigned}</div>
                  <span className="small text-primary">View unassigned &rarr;</span>
                </div>
              </div>

              {/* My Assigned */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`My Assigned Tickets: ${data.ownedByMe}. Press to view.`}
                  onClick={() => navigate("/staff/queue?owner=me")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?owner=me")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">My Assigned</span>
                  <div className="fs-3 fw-bold text-success my-1">{data.ownedByMe}</div>
                  <span className="small text-primary">View my queue &rarr;</span>
                </div>
              </div>

              {/* New */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`New Tickets: ${data.byStatus.NEW ?? 0}. Press to view.`}
                  onClick={() => navigate("/staff/queue?status=NEW")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?status=NEW")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">New</span>
                  <div className="fs-3 fw-bold text-dark my-1">{data.byStatus.NEW ?? 0}</div>
                  <span className="small text-primary">Filter New &rarr;</span>
                </div>
              </div>

              {/* Open */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open Tickets: ${data.byStatus.OPEN ?? 0}. Press to view.`}
                  onClick={() => navigate("/staff/queue?status=OPEN")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?status=OPEN")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">Open</span>
                  <div className="fs-3 fw-bold text-dark my-1">{data.byStatus.OPEN ?? 0}</div>
                  <span className="small text-primary">Filter Open &rarr;</span>
                </div>
              </div>

              {/* In Progress */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`In Progress Tickets: ${data.byStatus.IN_PROGRESS ?? 0}. Press to view.`}
                  onClick={() => navigate("/staff/queue?status=IN_PROGRESS")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?status=IN_PROGRESS")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">In Progress</span>
                  <div className="fs-3 fw-bold text-dark my-1">{data.byStatus.IN_PROGRESS ?? 0}</div>
                  <span className="small text-primary">Filter active &rarr;</span>
                </div>
              </div>

              {/* Waiting for Requester */}
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Waiting for Requester Tickets: ${data.byStatus.WAITING_FOR_REQUESTER ?? 0}. Press to view.`}
                  onClick={() => navigate("/staff/queue?status=WAITING_FOR_REQUESTER")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/staff/queue?status=WAITING_FOR_REQUESTER")}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: "8px" }}
                >
                  <span className="text-muted small fw-semibold">Waiting User</span>
                  <div className="fs-3 fw-bold text-warning-emphasis my-1">
                    {data.byStatus.WAITING_FOR_REQUESTER ?? 0}
                  </div>
                  <span className="small text-primary">Filter waiting &rarr;</span>
                </div>
              </div>
            </div>

            {/* Administrator-Only Widget (BR-14 / AC-14) */}
            {user?.role === "ADMINISTRATOR" && data.userCounts && (
              <div className="card shadow-sm border mb-4 p-3" style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }}>
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <h2 className="h6 fw-bold mb-0 text-success d-flex align-items-center gap-2">
                    <span>👥</span> System User Accounts
                  </h2>
                  <Link to="/admin/users" className="btn btn-sm btn-zen-secondary">
                    Manage Users &rarr;
                  </Link>
                </div>
                <div className="row g-3 text-center">
                  <div className="col-6 col-md-3">
                    <div className="p-2 border rounded bg-white">
                      <div className="small text-muted">Active Users</div>
                      <div className="fs-5 fw-bold text-success">{data.userCounts.active}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 border rounded bg-white">
                      <div className="small text-muted">Inactive Users</div>
                      <div className="fs-5 fw-bold text-secondary">{data.userCounts.inactive}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 border rounded bg-white">
                      <div className="small text-muted">Requesters</div>
                      <div className="fs-5 fw-bold text-dark">{data.userCounts.byRole.REQUESTER}</div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-2 border rounded bg-white">
                      <div className="small text-muted">IT Staff & Admins</div>
                      <div className="fs-5 fw-bold text-primary">
                        {data.userCounts.byRole.IT_STAFF + data.userCounts.byRole.ADMINISTRATOR}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lists and Breakdown Section */}
            <div className="row g-4">
              {/* Urgent Tickets (Top Priority) */}
              <div className="col-12 col-lg-7">
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h2 className="h6 fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                      <span className="badge bg-danger">HIGH</span> Urgent Tickets Pending
                    </h2>
                    <span className="small text-muted">Oldest neglected first</span>
                  </div>
                  <div className="card-body p-0">
                    {data.urgent.length === 0 ? (
                      <div className="p-4 text-center text-muted">No urgent tickets pending.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light small">
                            <tr>
                              <th>Ticket #</th>
                              <th>Summary</th>
                              <th>Status</th>
                              <th>Owner</th>
                              <th>Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.urgent.map((ticket) => (
                              <tr
                                key={ticket.id}
                                className="cursor-pointer"
                                onClick={() => navigate(`/staff/tickets/${ticket.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    navigate(`/staff/tickets/${ticket.id}`);
                                  }
                                }}
                                aria-label={`Urgent ticket ${ticket.ticketNumber}: ${ticket.summary}. Press to open detail.`}
                              >
                                <td className="fw-semibold text-primary">{ticket.ticketNumber}</td>
                                <td>
                                  <div className="text-truncate" style={{ maxWidth: 200 }}>
                                    {ticket.summary}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-zen-status">{ticket.currentStatus}</span>
                                </td>
                                <td>
                                  {ticket.ticketOwnerId ? (
                                    <span className="small text-muted">Assigned</span>
                                  ) : (
                                    <span className="badge bg-warning-subtle text-warning-emphasis">Unassigned</span>
                                  )}
                                </td>
                                <td className="small text-muted">{formatDate(ticket.updatedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Updated Across System */}
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h2 className="h6 fw-bold mb-0 text-dark">Recently Updated Across System</h2>
                    <Link to="/staff/queue" className="small text-decoration-none fw-semibold">
                      Full Queue &rarr;
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {data.recentlyUpdated.length === 0 ? (
                      <div className="p-4 text-center text-muted">No tickets found.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light small">
                            <tr>
                              <th>Ticket #</th>
                              <th>Summary</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.recentlyUpdated.map((ticket) => (
                              <tr
                                key={ticket.id}
                                className="cursor-pointer"
                                onClick={() => navigate(`/staff/tickets/${ticket.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    navigate(`/staff/tickets/${ticket.id}`);
                                  }
                                }}
                                aria-label={`Ticket ${ticket.ticketNumber}: ${ticket.summary}. Press to open detail.`}
                              >
                                <td className="fw-semibold text-primary">{ticket.ticketNumber}</td>
                                <td>
                                  <div className="text-truncate" style={{ maxWidth: 220 }}>
                                    {ticket.summary}
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge badge-zen-${(ticket.itPriority || "low").toLowerCase()}`}>
                                    {ticket.itPriority || "None"}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge badge-zen-status">{ticket.currentStatus}</span>
                                </td>
                                <td className="small text-muted">{formatDate(ticket.updatedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Queue Breakdown Widgets (col-lg-5) */}
              <div className="col-12 col-lg-5">
                {/* Priority Breakdown */}
                <div className="card shadow-sm border-0 p-3 mb-4">
                  <h3 className="h6 fw-bold mb-3 text-dark">Active Queue by IT Priority</h3>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-zen-high">HIGH</span>
                      <span className="fw-bold">{data.byItPriority.HIGH || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-zen-medium">MEDIUM</span>
                      <span className="fw-bold">{data.byItPriority.MEDIUM || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="badge badge-zen-low">LOW</span>
                      <span className="fw-bold">{data.byItPriority.LOW || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="card shadow-sm border-0 p-3 mb-4">
                  <h3 className="h6 fw-bold mb-3 text-dark">Active Queue by Status</h3>
                  <div className="d-flex flex-column gap-2 small">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-1">
                      <span>NEW</span>
                      <span className="fw-bold">{data.byStatus.NEW || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-1">
                      <span>OPEN</span>
                      <span className="fw-bold">{data.byStatus.OPEN || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-1">
                      <span>IN_PROGRESS</span>
                      <span className="fw-bold">{data.byStatus.IN_PROGRESS || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-1">
                      <span>WAITING_FOR_REQUESTER</span>
                      <span className="fw-bold">{data.byStatus.WAITING_FOR_REQUESTER || 0}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>REOPENED</span>
                      <span className="fw-bold">{data.byStatus.REOPENED || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Staff Links */}
                <div className="card shadow-sm border-0 p-3" style={{ backgroundColor: "#F4F8F5" }}>
                  <h3 className="h6 fw-bold mb-2" style={{ color: "#1E3A2F" }}>
                    Quick Queue Access
                  </h3>
                  <div className="d-flex flex-column gap-2">
                    <Link to="/staff/queue" className="btn btn-zen-primary btn-sm text-start">
                      Open Full Ticket Queue &rarr;
                    </Link>
                    <Link to="/staff/queue?owner=me" className="btn btn-zen-secondary btn-sm text-start">
                      Open My Assigned Queue &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
