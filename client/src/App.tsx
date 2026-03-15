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

function Router() {
  return (
    <Switch>
      <Route path="/quotes/:id/preview" component={QuotePreview} />
      <Route>
        {() => (
          <Layout>
            <Switch>
              <Route path="/api/login" component={() => { window.location.href = "/api/login"; return null; }} />
              <Route path="/login" component={Login} />
              <Route path="/" component={Home} />
              <Route path="/customers" component={Customers} />
              <Route path="/jobs" component={Jobs} />
              <Route path="/jobs/:id" component={JobDetail} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/quotes/new" component={QuoteCreate} />
              <Route path="/quotes/:id" component={QuoteDetail} />
              <Route path="/contacts" component={Contacts} />
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
