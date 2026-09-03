import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import RequesterSelection from "./features/requester/RequesterSelection";
import SystemCheck from "./features/system/SystemCheck";
import RequesterBadge from "./features/requester/RequesterBadge";
import CreateTicket from "./features/tickets/CreateTicket";

function RequireRequester({ children }: { children: React.ReactNode }) {
  const { requester } = useRequester();
  if (!requester) {
    return <Navigate to="/select-requester" replace />;
  }
  return <>{children}</>;
}

function MyTicketsPlaceholder() {
  return (
    <div className="container py-5">
      <h1 className="h3">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>
      <RequesterBadge />
      <p className="text-muted mt-3">My Tickets screen coming in Issue 8.</p>
      <Link to="/create-ticket" className="btn btn-success btn-sm mt-2">+ Create Ticket</Link>    
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/system-check" element={<SystemCheck />} />
          <Route path="/select-requester" element={<RequesterSelection />} />
          <Route
            path="/my-tickets"
            element={
              <RequireRequester>
                <MyTicketsPlaceholder />
              </RequireRequester>
            }
          />
          <Route path="/" element={<Navigate to="/select-requester" replace />} />
          <Route
            path="/create-ticket"
            element={
              <RequireRequester>
              <CreateTicket />
              </RequireRequester>
            }
          />
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}