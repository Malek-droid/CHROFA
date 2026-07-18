import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { AppointmentProvider } from "@/lib/appointment-context";
import { BusinessProvider } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Refresh } from "@solar-icons/react";

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      // Not authenticated → login
      navigate({ to: "/login" });
    } else if (!loading && user && !user.businessId) {
      // Authenticated but onboarding not complete → onboarding
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Refresh className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Safety net while navigation is in-flight
  if (!user || !user.businessId) {
    return null;
  }

  return (
    <BusinessProvider>
      <AppointmentProvider>
        <Outlet />
      </AppointmentProvider>
    </BusinessProvider>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});
