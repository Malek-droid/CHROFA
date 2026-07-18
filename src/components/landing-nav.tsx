import { Link } from "@tanstack/react-router";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo placeholder — replace with brand mark */}
        <Link to="/" className="flex items-center gap-3" aria-label="Chrofa home">
          <div
            aria-hidden
            className="h-9 w-28 rounded-md border border-dashed border-border"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/search" className="text-sm text-muted-foreground transition-opacity hover:opacity-70">Book</Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground transition-opacity hover:opacity-70">Dashboard</Link>
          <Link to="/calendar" className="text-sm text-muted-foreground transition-opacity hover:opacity-70">Calendar</Link>
          <Link to="/settings" className="text-sm text-muted-foreground transition-opacity hover:opacity-70">Settings</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-foreground transition-opacity hover:opacity-70 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
