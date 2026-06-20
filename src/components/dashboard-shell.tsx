import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, LayoutDashboard, CalendarDays, ListChecks, BarChart3, Settings, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/dashboard/appointments", label: "Appointments", icon: ListChecks },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          openMobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
            <CalendarClock className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Cadence</span>
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpenMobile(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">JA</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">Jamie Adler</div>
              <div className="truncate text-xs text-muted-foreground">Studio North</div>
            </div>
          </div>
        </div>
      </aside>

      {openMobile && (
        <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setOpenMobile(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpenMobile(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
