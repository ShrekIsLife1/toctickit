import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchRequesterDashboard, RequesterDashboardData } from "../../api";

export default function RequesterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RequesterDashboardData | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetchRequesterDashboard();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Requester";

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
        year: "numeric",
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
          <p className="text-muted mb-0 small">Here's what's happening with your requests.</p>
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
          <p className="text-muted mt-2">Loading dashboard…</p>
        </div>
      ) : (
        data && (
          <>
            {/* Metric Summary Cards Grid */}
            <div className="row g-3 mb-4">
              {/* Card 1: My Open Tickets */}
              <div className="col-12 col-sm-6 col-lg-3">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`My Open Tickets: ${data.openTickets} tickets. Press to view list.`}
                  onClick={() => navigate("/my-tickets?status=active")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/my-tickets?status=active")}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold">My Open Tickets</span>
                    <span className="badge rounded-pill bg-success-subtle text-success">Active</span>
                  </div>
                  <div className="fs-2 fw-bold text-dark">{data.openTickets}</div>
                  <div className="mt-2 text-primary small d-flex align-items-center gap-1">
                    <span>View all active</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Waiting for You */}
              <div className="col-12 col-sm-6 col-lg-3">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Waiting for You: ${data.waitingForRequester} tickets. Press to view list.`}
                  onClick={() => navigate("/my-tickets?status=WAITING_FOR_REQUESTER")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/my-tickets?status=WAITING_FOR_REQUESTER")}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold">Waiting for You</span>
                    <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">Action req.</span>
                  </div>
                  <div className="fs-2 fw-bold" style={{ color: "#B5770A" }}>
                    {data.waitingForRequester}
                  </div>
                  <div className="mt-2 text-primary small d-flex align-items-center gap-1">
                    <span>View pending input</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Recently Resolved */}
              <div className="col-12 col-sm-6 col-lg-3">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Recently Resolved: ${data.recentlyResolved} tickets. Press to view list.`}
                  onClick={() => navigate("/my-tickets?status=RESOLVED")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/my-tickets?status=RESOLVED")}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold">Recently Resolved</span>
                    <span className="badge rounded-pill bg-info-subtle text-info-emphasis">Past 7 days</span>
                  </div>
                  <div className="fs-2 fw-bold text-success">{data.recentlyResolved}</div>
                  <div className="mt-2 text-primary small d-flex align-items-center gap-1">
                    <span>View resolved</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Closed Tickets */}
              <div className="col-12 col-sm-6 col-lg-3">
                <div
                  className="card h-100 shadow-sm border p-3 cursor-pointer metric-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Closed Tickets: ${data.closedTickets} tickets. Press to view list.`}
                  onClick={() => navigate("/my-tickets?status=CLOSED")}
                  onKeyDown={(e) => handleCardKeyDown(e, "/my-tickets?status=CLOSED")}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "8px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-muted small fw-semibold">Closed Tickets</span>
                    <span className="badge rounded-pill bg-secondary-subtle text-secondary">Historical</span>
                  </div>
                  <div className="fs-2 fw-bold text-secondary">{data.closedTickets}</div>
                  <div className="mt-2 text-primary small d-flex align-items-center gap-1">
                    <span>View closed archive</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="row g-4">
              {/* Left / Primary: My Recent Tickets (65%) */}
              <div className="col-12 col-lg-8">
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h2 className="h6 fw-bold mb-0 text-dark">My Recent Tickets</h2>
                    <Link to="/my-tickets" className="small text-decoration-none fw-semibold">
                      View all &rarr;
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {data.recentlyUpdated.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-muted mb-3">No tickets found. Submit a request to get started.</p>
                        <Link to="/create-ticket" className="btn btn-zen-primary btn-sm">
                          + Create Ticket
                        </Link>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="table-responsive d-none d-md-block">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small">
                              <tr>
                                <th>Ticket #</th>
                                <th>Summary</th>
                                <th>Status</th>
                                <th>Last Updated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.recentlyUpdated.map((ticket) => (
                                <tr
                                  key={ticket.id}
                                  className="cursor-pointer"
                                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      navigate(`/tickets/${ticket.id}`);
                                    }
                                  }}
                                  aria-label={`Ticket ${ticket.ticketNumber}: ${ticket.summary}. Press to open detail.`}
                                >
                                  <td className="fw-semibold text-primary">{ticket.ticketNumber}</td>
                                  <td>
                                    <div className="text-truncate" style={{ maxWidth: 280 }}>
                                      {ticket.summary}
                                    </div>
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

                        {/* Mobile Stacked View */}
                        <div className="d-md-none divide-y">
                          {data.recentlyUpdated.map((ticket) => (
                            <div
                              key={ticket.id}
                              className="p-3 border-bottom cursor-pointer"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigate(`/tickets/${ticket.id}`);
                                }
                              }}
                              aria-label={`Ticket ${ticket.ticketNumber}: ${ticket.summary}. Press to open detail.`}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold text-primary small">{ticket.ticketNumber}</span>
                                <span className="badge badge-zen-status" style={{ fontSize: "0.7rem" }}>
                                  {ticket.currentStatus}
                                </span>
                              </div>
                              <div className="fw-semibold text-dark small mb-1">{ticket.summary}</div>
                              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                Updated: {formatDate(ticket.updatedAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right / Secondary: Quick Actions (35%) */}
              <div className="col-12 col-lg-4">
                <div className="card shadow-sm border-0 p-3 mb-3" style={{ backgroundColor: "#F4F8F5" }}>
                  <h3 className="h6 fw-bold mb-3" style={{ color: "#1E3A2F" }}>
                    Quick Actions
                  </h3>
                  <Link to="/create-ticket" className="btn btn-zen-primary w-100 mb-2">
                    + Create Ticket
                  </Link>
                  <Link to="/my-tickets" className="btn btn-zen-secondary w-100">
                    View My Tickets
                  </Link>
                </div>

                <div className="card shadow-sm border-0 p-3">
                  <h3 className="h6 fw-semibold text-muted mb-2">Need Assistance?</h3>
                  <p className="small text-muted mb-0">
                    TokTickIT allows you to report problems and request IT services. Check your open tickets for updates
                    from support engineers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
