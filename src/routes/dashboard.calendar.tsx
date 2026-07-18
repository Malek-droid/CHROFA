import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { type Appointment } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointment-context";
import { Button } from "@/components/ui/button";
import { AltArrowLeft, AltArrowRight } from "@solar-icons/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentModal } from "@/components/appointment-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Cadence" }] }),
  component: CalendarPage,
});

export function CalendarPage() {
  const { appointments } = useAppointments();
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<Appointment | null>(null);

  const days = view === "week" ? 7 : 1;
  const dates = Array.from({ length: days }).map((_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 11 }).map((_, i) => i + 8); // 8:00 – 18:00

  function shift(delta: number) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + delta * days);
    setAnchor(d);
  }

  return (
    <DashboardShell
      title="Calendar"
      actions={
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    >
      {/*
        The calendar page content is a flex column that fills the entire
        available main area (which itself is flex-1 min-h-0 in DashboardShell).
        h-full here means "fill the parent <main>'s inner height exactly".
        No overflow-y on this outer wrapper — scrolling is handled by the
        inner grid's overflow-x-auto only (for narrow viewports needing horizontal scroll).
      */}
      <div className="flex h-full flex-col">
        {/* Date navigation bar — fixed height, does not flex-grow */}
        <div className="flex shrink-0 items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {dates[0].toLocaleDateString(undefined, { month: "long", day: "numeric" })}
              {days > 1 &&
                ` — ${dates[dates.length - 1].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
            </h2>
            <span className="hidden sm:inline-block text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-medium">
              {days === 7 ? "Week view" : "Day view"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
              <AltArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setAnchor(new Date(new Date().setHours(0, 0, 0, 0)))}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
              <AltArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/*
          Grid container: flex-1 min-h-0 means it takes ALL remaining vertical space
          after the navigation bar above, and min-h-0 prevents the flex-child from
          refusing to shrink below its intrinsic content height.

          overflow-x-auto: week view is wide (7 columns), allow horizontal scroll
          on narrow screens while keeping vertical fixed.
          overflow-y-hidden: explicitly prevent any vertical scroll bleed-out.
        */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-card">
          {/*
            The inner grid: h-full so it stretches to fill the container above.
            grid-rows is set to: auto (day-label header row) + 11 equal fr rows
            (one per hour: 8–18). The fr unit distributes the remaining height
            evenly across all hour rows, so they compress/expand with the viewport
            instead of using a fixed 64px that overflows at 768px height.

            Minimum legibility: each cell has min-h-[32px] as a guard rail —
            at 32px the 10px hour label and one truncated text line remain readable.
            Below ~560px viewport height some compression is unavoidable but the
            grid still fits without scrolling.
          */}
          <div
            className="grid h-full bg-card"
            style={{
              gridTemplateColumns: `64px repeat(${days}, minmax(120px, 1fr))`,
              gridTemplateRows: `auto repeat(${hours.length}, 1fr)`,
              minWidth: days > 1 ? 800 : undefined,
            }}
          >
            {/* Top-left empty corner cell */}
            <div className="bg-card border-b border-r border-border/40 flex items-center justify-center text-[10px] text-muted-foreground/60 select-none font-medium">
              Time
            </div>

            {/* Day header cells */}
            {dates.map((d, i) => (
              <div
                key={d.toISOString()}
                className={cn(
                  "bg-card px-3 py-2.5 flex flex-col items-center justify-center gap-0.5 border-b border-border/40",
                  i < days - 1 && "border-r border-border/40",
                )}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    d.toDateString() === new Date().toDateString()
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground",
                  )}
                >
                  {d.getDate()}
                </div>
              </div>
            ))}

            {/* Hour rows */}
            {hours.map((h, hIdx) => (
              <div key={`row-${h}`} className="contents">
                {/* Hour label cell */}
                <div
                  className={cn(
                    "bg-card pr-3.5 pl-2 py-1 text-right text-[11px] font-medium text-muted-foreground/80 border-r border-border/40 select-none flex items-center justify-end",
                    hIdx < hours.length - 1 && "border-b border-border/30",
                  )}
                >
                  {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </div>

                {/* Day cells for this hour */}
                {dates.map((d, dIdx) => {
                  const slot = appointments.find((a) => {
                    const ad = new Date(a.date);
                    return ad.toDateString() === d.toDateString() && ad.getHours() === h;
                  });
                  return (
                    <div
                      key={`${d.toISOString()}-${h}`}
                      className={cn(
                        "relative bg-card/20 transition-colors hover:bg-muted/5",
                        hIdx < hours.length - 1 && "border-b border-border/30",
                        dIdx < days - 1 && "border-r border-border/30",
                      )}
                    >
                      {slot && (
                        <button
                          onClick={() => setSelected(slot)}
                          className={cn(
                            "absolute inset-1 rounded-md border-l-4 px-2.5 py-1.5 text-left transition shadow-sm flex flex-col justify-start",
                            slot.status === "confirmed" &&
                              "bg-primary/10 border-primary border border-y-primary/20 border-r-primary/20 text-primary",
                            slot.status === "pending" &&
                              "bg-amber-500/10 border-amber-500 border border-y-amber-500/20 border-r-amber-500/20 text-amber-500",
                            slot.status === "cancelled" &&
                              "bg-destructive/10 border-destructive border border-y-destructive/20 border-r-destructive/20 text-muted-foreground line-through",
                          )}
                        >
                          <div className="truncate text-xs font-semibold text-foreground/90">
                            {slot.customer}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground font-medium mt-0.5">
                            {slot.service}
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppointmentModal
        appointment={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </DashboardShell>
  );
}
