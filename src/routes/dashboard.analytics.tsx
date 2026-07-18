import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CalendarDate, ClockCircle, DangerCircle, Pulse } from "@solar-icons/react";
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
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Cadence" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [trend, setTrend] = useState<Array<{ day: string; bookings: number; cancels: number }>>([]);
  const [services, setServices] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendsData, servicesData] = await Promise.all([
          apiFetch("/analytics/trends"),
          apiFetch("/analytics/services"),
        ]);
        setTrend(trendsData.trends);
        setServices(servicesData.services);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { label: "Total appointments", value: loading ? "..." : String(trend.reduce((sum, t) => sum + t.bookings, 0)), icon: CalendarDate, hint: "Last 7 days" },
    { label: "Upcoming", value: loading ? "..." : String(trend.reduce((sum, t) => sum + t.bookings, 0)), icon: ClockCircle, hint: "Next 7 days" },
    { label: "Cancellation rate", value: loading ? "..." : `${((trend.reduce((sum, t) => sum + t.cancels, 0) / Math.max(trend.reduce((sum, t) => sum + t.bookings, 0), 1)) * 100).toFixed(1)}%`, icon: DangerCircle, hint: "Last 7 days" },
    { label: "No-show risk", value: "Low", icon: Pulse, hint: "Based on 7-day signal" },
  ];

  return (
    <DashboardShell title="Analytics">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
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
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Bookings this week</h2>
          <p className="text-xs text-muted-foreground">Confirmed vs cancelled</p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="var(--color-primary)"
                    fill="url(#g1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Top services</h2>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading chart data...
              </div>
            ) : services.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No service data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={services} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "var(--color-muted)" }}
                  />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
