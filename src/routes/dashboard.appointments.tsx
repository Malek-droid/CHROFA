import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { type Appointment } from "@/lib/mock-data";
import { useAppointments } from "@/lib/appointment-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppointmentModal } from "@/components/appointment-modal";
import { Magnifier } from "@solar-icons/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Cadence" }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { appointments } = useAppointments();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const filtered = useMemo(
    () =>
      appointments.filter((a) =>
        `${a.customer} ${a.service} ${a.staffName}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, appointments],
  );

  return (
    <DashboardShell title="Appointments">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Magnifier className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, service, staff"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelected(a)}>
                <TableCell className="font-medium">{a.customer}</TableCell>
                <TableCell>{a.service}</TableCell>
                <TableCell className="text-muted-foreground">{a.staffName ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(a.date).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.durationMinutes}m</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      a.status === "confirmed"
                        ? "default"
                        : a.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AppointmentModal
        appointment={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </DashboardShell>
  );
}
