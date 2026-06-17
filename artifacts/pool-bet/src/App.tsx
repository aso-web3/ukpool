import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import PublicHome from "@/pages/PublicHome";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTickets from "@/pages/admin/AdminTickets";
import AdminApplications from "@/pages/admin/AdminApplications";
import AdminAgents from "@/pages/admin/AdminAgents";
import AdminWeeks from "@/pages/admin/AdminWeeks";
import AdminWeekDetail from "@/pages/admin/AdminWeekDetail";
import AgentDashboard from "@/pages/agent/AgentDashboard";
import AgentCashiers from "@/pages/agent/AgentCashiers";
import AgentTickets from "@/pages/agent/AgentTickets";
import CashierDashboard from "@/pages/cashier/CashierDashboard";
import CashierSell from "@/pages/cashier/CashierSell";
import CashierTickets from "@/pages/cashier/CashierTickets";
import TicketDetail from "@/pages/TicketDetail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
});

function Protected({ roles, children }: { roles: ("admin" | "agent" | "cashier")[]; children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={PublicHome} />
      <Route path="/login" component={Login} />

      <Route path="/admin">{() => <Protected roles={["admin"]}><AdminDashboard /></Protected>}</Route>
      <Route path="/admin/tickets">
  {() => (
    <Protected roles={["admin"]}>
      <AdminTickets />
    </Protected>
  )}
</Route>
      <Route path="/admin/applications">{() => <Protected roles={["admin"]}><AdminApplications /></Protected>}</Route>
      <Route path="/admin/agents">{() => <Protected roles={["admin"]}><AdminAgents /></Protected>}</Route>
      <Route path="/admin/weeks">{() => <Protected roles={["admin"]}><AdminWeeks /></Protected>}</Route>
      <Route path="/admin/weeks/:id">{() => <Protected roles={["admin"]}><AdminWeekDetail /></Protected>}</Route>

      <Route path="/agent">{() => <Protected roles={["agent"]}><AgentDashboard /></Protected>}</Route>
      <Route path="/agent/cashiers">{() => <Protected roles={["agent"]}><AgentCashiers /></Protected>}</Route>
      <Route path="/agent/tickets">{() => <Protected roles={["agent"]}><AgentTickets /></Protected>}</Route>

      <Route path="/cashier">{() => <Protected roles={["cashier"]}><CashierDashboard /></Protected>}</Route>
      <Route path="/cashier/sell/:weekId">{() => <Protected roles={["cashier"]}><CashierSell /></Protected>}</Route>
      <Route path="/cashier/tickets">{() => <Protected roles={["cashier"]}><CashierTickets /></Protected>}</Route>

      <Route path="/tickets/:id">{() => <Protected roles={["admin", "agent", "cashier"]}><TicketDetail /></Protected>}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
