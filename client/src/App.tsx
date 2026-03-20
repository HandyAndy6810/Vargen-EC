import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Customers from "@/pages/Customers";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Quotes from "@/pages/Quotes";
import QuoteDetail from "@/pages/QuoteDetail";
import QuoteCreate from "@/pages/QuoteCreate";
import Contacts from "@/pages/Contacts";
import Profile from "@/pages/Profile";
import QuotePreview from "@/pages/QuotePreview";
import Portal from "@/pages/Portal";
import Invoices from "@/pages/Invoices";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoicePreview from "@/pages/InvoicePreview";
import ResetPassword from "@/pages/ResetPassword";

function Router() {
  return (
    <Switch>
      {/* Public routes — no auth/layout wrapper */}
      <Route path="/quotes/:id/preview" component={QuotePreview} />
      <Route path="/portal/:token" component={Portal} />
      <Route path="/invoices/:id/preview" component={InvoicePreview} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route>
        {() => (
          <Layout>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={Home} />
              <Route path="/customers" component={Customers} />
              <Route path="/jobs" component={Jobs} />
              <Route path="/jobs/:id" component={JobDetail} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/quotes/new" component={QuoteCreate} />
              <Route path="/quotes/:id" component={QuoteDetail} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/:id" component={InvoiceDetail} />
              <Route path="/profile" component={Profile} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
