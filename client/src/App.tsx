import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import RequesterSelection from "./features/requester/RequesterSelection";
import SystemCheck from "./features/system/SystemCheck";
import RequesterBadge from "./features/requester/RequesterBadge";
import CreateTicket from "./features/tickets/CreateTicket";
import MyTickets from "./features/tickets/MyTickets";

function RequireRequester({ children }: { children: React.ReactNode }) {
  const { requester } = useRequester();
  if (!requester) {
    return <Navigate to="/select-requester" replace />;
  }
  return <>{children}</>;
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
                <MyTickets />
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