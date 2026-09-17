import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./features/auth/Login";
import ChangePassword from "./features/auth/ChangePassword";
import SystemCheck from "./features/system/SystemCheck";
import CreateTicket from "./features/tickets/CreateTicket";
import MyTickets from "./features/tickets/MyTickets";
import RequesterTicketDetail from "./features/tickets/RequesterTicketDetail";
import AppShell from "./components/AppShell";
import StaffTicketQueue from "./features/staff/StaffTicketQueue";
import StaffTicketDetail from "./features/staff/StaffTicketDetail";

function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">;
}) {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}

function Forbidden() {
  return (
    <div className="container py-5">
      <div className="alert alert-warning">
        You do not have permission to view this page.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/system-check" element={<SystemCheck />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/forbidden" element={<Forbidden />} />

          <Route
            path="/my-tickets"
            element={
              <RequireAuth roles={["REQUESTER"]}>
                <AppShell>
                  <MyTickets />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/create-ticket"
            element={
              <RequireAuth roles={["REQUESTER"]}>
                <AppShell>
                  <CreateTicket />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <RequireAuth roles={["REQUESTER"]}>
                <AppShell>
                  <RequesterTicketDetail />
                </AppShell>
              </RequireAuth>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/staff/queue"
            element={
              <RequireAuth roles={["IT_STAFF", "ADMINISTRATOR"]}>
                <AppShell>
                  <StaffTicketQueue />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/staff/tickets/:id"
            element={
              <RequireAuth roles={["IT_STAFF", "ADMINISTRATOR"]}>
                <AppShell>
                  <StaffTicketDetail />
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}