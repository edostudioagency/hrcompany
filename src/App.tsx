import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Shifts from "./pages/Shifts";
import TimeOff from "./pages/TimeOff";
import Swaps from "./pages/Swaps";
import Commissions from "./pages/Commissions";
import Payslips from "./pages/Payslips";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
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
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
