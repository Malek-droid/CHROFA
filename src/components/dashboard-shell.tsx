import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Widget,
  Calendar,
  Checklist,
  ChartSquare,
  Settings,
  AltArrowLeft,
  Sidebar,
  Logout,
  HamburgerMenu,
} from "@solar-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Overview", icon: Widget, exact: true },
  { to: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard/appointments", label: "Appointments", icon: Checklist },
  { to: "/dashboard/analytics", label: "Analytics", icon: ChartSquare },
];

const SETTINGS_NAV = [{ to: "/dashboard/settings", label: "Settings", icon: Settings }];

function FlowPathLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 153.3 137.3 A 65 65 0 1 1 153.3 62.7" />
        <path d="M 120 70 C 145 85 95 115 120 130" />
      </g>
    </svg>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 relative",
        collapsed && "justify-center px-0",
        active
          ? "bg-brand-ink/10 text-brand-ink"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
          style={{ backgroundColor: "#78A1BB" }}
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", collapsed && "h-5 w-5")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function DashboardShell({
  title,
  description,
  action,
  actions,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully.");
      navigate({ to: "/login" });
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const headerAction = action || actions;

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden lg:static",
          collapsed ? "w-16" : "w-60",
          collapsed ? "lg:w-16" : "lg:w-60",
          openMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-[width,transform] duration-300 ease-in-out",
        )}
      >
        {/* Logo + toggle */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center",
            collapsed ? "justify-center px-0" : "justify-between px-5",
          )}
        >
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-ink text-primary-foreground">
              <FlowPathLogo className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="font-display text-lg tracking-tight text-foreground">CHROFA</span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <AltArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setOpenMobile(false)}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className={cn(collapsed ? "mx-3" : "mx-5", "h-px bg-border")} />

        {/* Settings */}
        <nav className="space-y-0.5 p-3">
          {SETTINGS_NAV.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setOpenMobile(false)}
            />
          ))}
        </nav>

        {/* User area */}
        <div className={cn("shrink-0 border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent transition-all duration-200",
              collapsed && "justify-center px-0",
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-steel/20 text-steel text-xs font-medium">
              {initials}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-foreground truncate">
                    {user?.name || "User"}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </span>
                </span>
                <Logout className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {openMobile && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* Expand button when collapsed (desktop only) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed left-[4.5rem] bottom-6 z-20 h-7 w-7 items-center justify-center rounded-md border border-border bg-sidebar text-muted-foreground hover:text-foreground transition-colors shadow-sm"
          title="Expand sidebar"
        >
          <Sidebar className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="hidden lg:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                title="Expand sidebar"
              >
                <Sidebar className="h-4 w-4" />
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpenMobile(true)}
            >
              <HamburgerMenu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-xl md:text-2xl text-foreground truncate">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              )}
            </div>
          </div>
          {headerAction && <div className="ml-4 shrink-0">{headerAction}</div>}
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-10 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
