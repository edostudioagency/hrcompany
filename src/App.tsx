import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { toast } from "sonner";

// Pages
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Shifts from "./pages/Shifts";
import TimeOff from "./pages/TimeOff";
import Swaps from "./pages/Swaps";
import Commissions from "./pages/Commissions";
import Payslips from "./pages/Payslips";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CreateCompany from "./pages/CreateCompany";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401/403 errors
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Une erreur est survenue";
        toast.error(message);
      },
    },
  },
});

function SessionManager({ children }: { children: React.ReactNode }) {
  useSessionTimeout();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SessionManager>
        <CompanyProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Protected routes - all authenticated users */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/shifts" element={
                <ProtectedRoute>
                  <Shifts />
                </ProtectedRoute>
              } />
              <Route path="/time-off" element={
                <ProtectedRoute>
                  <TimeOff />
                </ProtectedRoute>
              } />
              <Route path="/swaps" element={
                <ProtectedRoute>
                  <Swaps />
                </ProtectedRoute>
              } />
              <Route path="/payslips" element={
                <ProtectedRoute>
                  <Payslips />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Protected routes - admin and manager only */}
              <Route path="/employees" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Employees />
                </ProtectedRoute>
              } />
              <Route path="/commissions" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Commissions />
                </ProtectedRoute>
              } />
              
              {/* Protected routes - admin only */}
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/company/new" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CreateCompany />
                </ProtectedRoute>
              } />
              
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </CompanyProvider>
        </SessionManager>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
