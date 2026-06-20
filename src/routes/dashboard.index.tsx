import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { APPOINTMENTS, type Appointment } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, CalendarCheck, Clock, AlertCircle } from "lucide-react";
import { AppointmentModal } from "@/components/appointment-modal";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Cadence" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  const [selected, setSelected] = useState<Appointment | null>(null);
  const upcoming = APPOINTMENTS.filter((a) => new Date(a.date) >= new Date() && a.status !== "cancelled");
  const today = APPOINTMENTS.filter((a) => new Date(a.date).toDateString() === new Date().toDateString());

  const stats = [
    { label: "Today's appointments", value: today.length, icon: CalendarCheck, hint: "+2 vs yesterday" },
    { label: "Upcoming this week", value: upcoming.length, icon: Clock, hint: "Across 3 staff" },
    { label: "Cancellation rate", value: "4.2%", icon: AlertCircle, hint: "Down 0.8%" },
    { label: "Booking velocity", value: "+18%", icon: TrendingUp, hint: "vs last week" },
  ];

  return (
    <DashboardShell
      title="Overview"
      actions={
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New appointment</Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Mini week calendar */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">This week</h2>
              <p className="text-xs text-muted-foreground">A quick view of the next five days.</p>
            </div>
          </div>
          <WeekGrid onSelect={setSelected} />
        </div>

        {/* Upcoming list */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
            <p className="text-xs text-muted-foreground">Click any appointment to view details.</p>
          </div>
          <ul className="divide-y divide-border">
            {upcoming.slice(0, 6).map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{a.customer}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.service} · {new Date(a.date).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>{a.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AppointmentModal appointment={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </DashboardShell>
  );
}

function WeekGrid({ onSelect }: { onSelect: (a: Appointment) => void }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  return (
    <div className="overflow-x-auto p-3">
      <div className="grid min-w-[640px] grid-cols-[60px_repeat(5,1fr)] gap-px bg-border">
        <div className="bg-card" />
        {days.map((d) => (
          <div key={d.toISOString()} className="bg-card px-2 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString([], { weekday: "short" })}</div>
            <div className="text-sm font-medium text-foreground">{d.getDate()}</div>
          </div>
        ))}
        {hours.map((h) => (
          <>
            <div key={`h-${h}`} className="bg-card px-2 py-3 text-right text-[10px] text-muted-foreground">{h}:00</div>
            {days.map((d) => {
              const slot = APPOINTMENTS.find((a) => {
                const ad = new Date(a.date);
                return ad.toDateString() === d.toDateString() && ad.getHours() === h;
              });
              return (
                <div key={`${d.toISOString()}-${h}`} className="relative min-h-[52px] bg-card">
                  {slot && (
                    <button
                      onClick={() => onSelect(slot)}
                      className="absolute inset-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-left text-[11px] text-foreground transition hover:bg-primary/25"
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
  );
}
