import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { APPOINTMENTS, type Appointment } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentModal } from "@/components/appointment-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Cadence" }] }),
  component: CalendarPage,
});

function CalendarPage() {
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
  const hours = Array.from({ length: 11 }).map((_, i) => i + 8); // 8 - 18

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
      <div className="flex items-center justify-between pb-4">
        <div className="text-sm text-muted-foreground">
          {dates[0].toLocaleDateString([], { month: "long", day: "numeric" })}
          {days > 1 && ` — ${dates[dates.length - 1].toLocaleDateString([], { month: "short", day: "numeric" })}`}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date(new Date().setHours(0, 0, 0, 0)))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div
          className="grid gap-px bg-border"
          style={{ gridTemplateColumns: `64px repeat(${days}, minmax(120px, 1fr))`, minWidth: days > 1 ? 800 : undefined }}
        >
          <div className="bg-card" />
          {dates.map((d) => (
            <div key={d.toISOString()} className="bg-card px-3 py-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString([], { weekday: "short" })}</div>
              <div className={cn("text-sm font-medium", d.toDateString() === new Date().toDateString() ? "text-primary" : "text-foreground")}>{d.getDate()}</div>
            </div>
          ))}

          {hours.map((h) => (
            <>
              <div key={`h-${h}`} className="bg-card px-2 py-3 text-right text-[10px] text-muted-foreground">{h}:00</div>
              {dates.map((d) => {
                const slot = APPOINTMENTS.find((a) => {
                  const ad = new Date(a.date);
                  return ad.toDateString() === d.toDateString() && ad.getHours() === h;
                });
                return (
                  <div key={`${d.toISOString()}-${h}`} className="relative min-h-[64px] bg-card">
                    {slot && (
                      <button
                        onClick={() => setSelected(slot)}
                        className={cn(
                          "absolute inset-1 rounded-md border px-2 py-1.5 text-left text-[11px] transition",
                          slot.status === "cancelled"
                            ? "border-destructive/40 bg-destructive/10 text-muted-foreground line-through"
                            : "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/25",
                        )}
                      >
                        <div className="truncate font-medium">{slot.customer}</div>
                        <div className="truncate text-muted-foreground">{slot.service}</div>
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <AppointmentModal appointment={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </DashboardShell>
  );
}
