import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/lib/mock-data";
import { Calendar, Clock, User, Briefcase } from "lucide-react";

export function AppointmentModal({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!appointment) return null;
  const dt = new Date(appointment.date);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{appointment.customer}</DialogTitle>
            <Badge variant={appointment.status === "confirmed" ? "default" : appointment.status === "pending" ? "secondary" : "destructive"}>
              {appointment.status}
            </Badge>
          </div>
          <DialogDescription>Appointment details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row icon={Briefcase} label="Service" value={appointment.service} />
          <Row icon={Calendar} label="Date" value={dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />
          <Row icon={Clock} label="Time" value={`${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${appointment.duration}m`} />
          {appointment.staff && <Row icon={User} label="Staff" value={appointment.staff} />}
        </div>
        <DialogFooter>
          <Button variant="outline">Reschedule</Button>
          <Button variant="destructive">Cancel booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-foreground">{value}</div>
      </div>
    </div>
  );
}
