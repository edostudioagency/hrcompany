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
import Exports from "./pages/Exports";
import Companies from "./pages/Companies";
import Teams from "./pages/Teams";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
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
              
              {/* Protected routes - admin and manager only */}
              <Route path="/employees" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Employees />
                </ProtectedRoute>
              } />
              <Route path="/teams" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Teams />
                </ProtectedRoute>
              } />
              <Route path="/exports" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Exports />
                </ProtectedRoute>
              } />
              
              {/* Protected routes - admin only */}
              <Route path="/companies" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Companies />
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
