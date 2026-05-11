import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import CartPage from "@/pages/cart";
import WishlistPage from "@/pages/wishlist";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import ProductsPage from "@/pages/products";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/" component={LandingPage} />
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
