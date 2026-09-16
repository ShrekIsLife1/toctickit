import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import RequesterSelection from "./features/requester/RequesterSelection";
import SystemCheck from "./features/system/SystemCheck";
import RequesterBadge from "./features/requester/RequesterBadge";
import CreateTicket from "./features/tickets/CreateTicket";
import MyTickets from "./features/tickets/MyTickets";
import RequesterTicketDetail from "./features/tickets/RequesterTicketDetail";
import AppShell from "./components/AppShell";

function RequireRequester({ children }: { children: React.ReactNode }) {
  const { requester, isInitializing } = useRequester();

  if (isInitializing) {
    return null; // or a spinner
  }
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
	      <AppShell>
		<MyTickets />
	      </AppShell>
	    </RequireRequester>
	  }
	/>
	<Route
	  path="/create-ticket"
	  element={
	    <RequireRequester>
	      <AppShell>
		<CreateTicket />
	      </AppShell>
	    </RequireRequester>
	  }
	/>
	<Route
	  path="/tickets/:id"
	  element={
	    <RequireRequester>
	      <AppShell>
		<RequesterTicketDetail />
	      </AppShell>
	    </RequireRequester>
	  }
	/>
	<Route path="/" element={<Navigate to="/select-requester" replace />} />
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}
