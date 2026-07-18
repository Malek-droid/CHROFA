import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { type Appointment } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { AddCircle, GraphUp, CalendarDate, ClockCircle, DangerCircle, Refresh } from "@solar-icons/react";
import { AppointmentModal } from "@/components/appointment-modal";
import { NewAppointmentModal } from "@/components/new-appointment-modal";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/lib/appointment-context";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Cadence" }] }),
  component: DashboardHome,
});

function DashboardHome() {
  const { appointments } = useAppointments();
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [stats, setStats] = useState<{
    todayAppointments: number;
    upcomingThisWeek: number;
    cancellationRate: string;
    bookingVelocity: string;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch("/analytics/overview");
        setStats(data.stats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const upcoming = appointments.filter(
    (a) => new Date(a.date) >= new Date() && a.status !== "cancelled",
  );
  const today = appointments.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString(),
  );

  const statsCards = statsLoading
    ? [
        { label: "Today's appointments", value: "...", icon: CalendarDate, hint: "Loading" },
        { label: "Upcoming this week", value: "...", icon: ClockCircle, hint: "Loading" },
        { label: "Cancellation rate", value: "...", icon: DangerCircle, hint: "Loading" },
        { label: "Booking velocity", value: "...", icon: GraphUp, hint: "Loading" },
      ]
    : stats
    ? [
        {
          label: "Today's appointments",
          value: stats.todayAppointments,
          icon: CalendarDate,
          hint: stats.todayAppointments > 0 ? "Today" : "No appointments today",
        },
        {
          label: "Upcoming this week",
          value: stats.upcomingThisWeek,
          icon: ClockCircle,
          hint: stats.upcomingThisWeek > 0 ? "Next 7 days" : "No upcoming appointments",
        },
        { label: "Cancellation rate", value: stats.cancellationRate, icon: DangerCircle, hint: "Last 30 days" },
        { label: "Booking velocity", value: stats.bookingVelocity, icon: GraphUp, hint: "vs last week" },
      ]
    : [];

  return (
    <DashboardShell
      title="Overview"
      actions={
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <AddCircle className="mr-1 h-4 w-4" /> New appointment
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {s.value}
            </div>
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
          <WeekGrid appointments={appointments} onSelect={setSelected} />
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
                    <div className="truncate text-xs text-muted-foreground">
                      {a.service} ·{" "}
                      {new Date(a.date).toLocaleString([], {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <Badge variant={a.status === "confirmed" ? "default" : "secondary"}>
                    {a.status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AppointmentModal
        appointment={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <NewAppointmentModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </DashboardShell>
  );
}

function WeekGrid({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
}) {
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
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {d.toLocaleDateString([], { weekday: "short" })}
            </div>
            <div className="text-sm font-medium text-foreground">{d.getDate()}</div>
          </div>
        ))}
        {hours.map((h) => (
          <div key={`row-${h}`} className="contents">
            <div className="bg-card px-2 py-3 text-right text-[10px] text-muted-foreground">
              {h}:00
            </div>
            {days.map((d) => {
              const slot = appointments.find((a) => {
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
          </div>
        ))}
      </div>
    </div>
  );
}
