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

const SERVICE_COLORS = [
  {
    bg: "bg-[#78A1BB]/10",
    border: "border-[#78A1BB]",
    borderLight: "border-y-[#78A1BB]/20 border-r-[#78A1BB]/20",
    text: "text-[#2e6a8c]",
  },
  {
    bg: "bg-[#9B8EA0]/10",
    border: "border-[#9B8EA0]",
    borderLight: "border-y-[#9B8EA0]/20 border-r-[#9B8EA0]/20",
    text: "text-[#6b4f74]",
  },
  {
    bg: "bg-[#7AB8A4]/10",
    border: "border-[#7AB8A4]",
    borderLight: "border-y-[#7AB8A4]/20 border-r-[#7AB8A4]/20",
    text: "text-[#2e7a63]",
  },
  {
    bg: "bg-[#C4A882]/10",
    border: "border-[#C4A882]",
    borderLight: "border-y-[#C4A882]/20 border-r-[#C4A882]/20",
    text: "text-[#8a6233]",
  },
  {
    bg: "bg-[#8EA8C3]/10",
    border: "border-[#8EA8C3]",
    borderLight: "border-y-[#8EA8C3]/20 border-r-[#8EA8C3]/20",
    text: "text-[#2d5476]",
  },
  {
    bg: "bg-[#A8B87A]/10",
    border: "border-[#A8B87A]",
    borderLight: "border-y-[#A8B87A]/20 border-r-[#A8B87A]/20",
    text: "text-[#5a6e1f]",
  },
  {
    bg: "bg-[#BF8E8E]/10",
    border: "border-[#BF8E8E]",
    borderLight: "border-y-[#BF8E8E]/20 border-r-[#BF8E8E]/20",
    text: "text-[#7a3535]",
  },
  {
    bg: "bg-[#BFA89E]/10",
    border: "border-[#BFA89E]",
    borderLight: "border-y-[#BFA89E]/20 border-r-[#BFA89E]/20",
    text: "text-[#705244]",
  },
  {
    bg: "bg-[#B8A07A]/10",
    border: "border-[#B8A07A]",
    borderLight: "border-y-[#B8A07A]/20 border-r-[#B8A07A]/20",
    text: "text-[#7a5e1e]",
  },
  {
    bg: "bg-[#A0B89B]/10",
    border: "border-[#A0B89B]",
    borderLight: "border-y-[#A0B89B]/20 border-r-[#A0B89B]/20",
    text: "text-[#3a6335]",
  },
];

function getServiceColor(service: string) {
  if (!service) return SERVICE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = service.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SERVICE_COLORS.length;
  return SERVICE_COLORS[index];
}

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
                      {slot && (() => {
                        const color = getServiceColor(slot.service);
                        const isCancelled = slot.status === "cancelled";
                        return (
                          <button
                            onClick={() => setSelected(slot)}
                            className={cn(
                              "absolute inset-1 rounded-md border-l-[3px] border px-3 py-1 text-left transition shadow-sm flex items-center hover:opacity-90 overflow-hidden",
                              isCancelled
                                ? "bg-destructive/10 border-destructive border border-y-destructive/20 border-r-destructive/20 text-muted-foreground line-through"
                                : cn(color.bg, color.border, color.borderLight, color.text)
                            )}
                          >
                            <div className="truncate text-[11px] select-none w-full">
                              <span className="font-bold">{slot.customer}</span>
                              <span className="mx-1.5 opacity-60">•</span>
                              <span className="text-[10px] font-medium opacity-80">{slot.service}</span>
                            </div>
                          </button>
                        );
                      })()}
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
