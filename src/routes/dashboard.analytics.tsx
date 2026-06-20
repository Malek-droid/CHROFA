import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { CalendarCheck, Clock, AlertCircle, Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Cadence" }] }),
  component: AnalyticsPage,
});

const trend = [
  { day: "Mon", bookings: 12, cancels: 1 },
  { day: "Tue", bookings: 18, cancels: 2 },
  { day: "Wed", bookings: 15, cancels: 0 },
  { day: "Thu", bookings: 22, cancels: 3 },
  { day: "Fri", bookings: 26, cancels: 1 },
  { day: "Sat", bookings: 30, cancels: 2 },
  { day: "Sun", bookings: 9, cancels: 0 },
];

const services = [
  { name: "Haircut", count: 42 },
  { name: "Color", count: 18 },
  { name: "Consult", count: 27 },
  { name: "Massage", count: 14 },
];

function AnalyticsPage() {
  const stats = [
    { label: "Total appointments", value: "132", icon: CalendarCheck, hint: "Last 30 days" },
    { label: "Upcoming", value: "28", icon: Clock, hint: "Next 7 days" },
    { label: "Cancellation rate", value: "4.2%", icon: AlertCircle, hint: "−0.8% vs prior" },
    { label: "No-show risk", value: "Low", icon: Activity, hint: "Based on 7-day signal" },
  ];

  return (
    <DashboardShell title="Analytics">
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Bookings this week</h2>
          <p className="text-xs text-muted-foreground">Confirmed vs cancelled</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="bookings" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Top services</h2>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
