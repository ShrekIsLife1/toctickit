import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import RequesterBadge from "../features/requester/RequesterBadge";

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  function isActive(path: string) {
    return location.pathname.startsWith(path);
  }

  return (
    <>
      <header className="app-header py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Link to="/my-tickets" className="fw-bold fs-5">
            TokTickIT
          </Link>
          <Link
            to="/my-tickets"
            className={`app-nav-link ${isActive("/my-tickets") ? "active" : ""}`}
          >
            My Tickets
          </Link>
          <Link
            to="/create-ticket"
            className={`app-nav-link ${isActive("/create-ticket") ? "active" : ""}`}
          >
            + Create Ticket
          </Link>
        </div>
        <RequesterBadge />
      </header>
      <main>{children}</main>
    </>
  );
}
