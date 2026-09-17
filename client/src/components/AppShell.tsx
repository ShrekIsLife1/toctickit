import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function isActive(path: string) {
    return location.pathname.startsWith(path);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <>
      <header className="app-header py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Link to="/my-tickets" className="fw-bold fs-5">
            TokTickIT
          </Link>
          {user?.role === "REQUESTER" && (
            <>
              <Link to="/my-tickets" className={`app-nav-link ${isActive("/my-tickets") ? "active" : ""}`}>
                My Tickets
              </Link>
              <Link to="/create-ticket" className={`app-nav-link ${isActive("/create-ticket") ? "active" : ""}`}>
                + Create Ticket
              </Link>
            </>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-white-50">
            {user?.name} <span className="badge bg-white text-dark ms-1">{user?.role}</span>
          </span>
          <button className="btn btn-sm btn-zen-secondary bg-white" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}