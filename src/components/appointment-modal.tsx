import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Appointment } from "@/lib/mock-data";
import { Calendar, ClockCircle, User, Suitcase, Refresh, ArrowLeft } from "@solar-icons/react";
import { useState } from "react";
import { useAppointments } from "@/lib/appointment-context";
import { useBusiness } from "@/lib/business-context";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";

export function AppointmentModal({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { cancelAppointment, updateAppointment } = useAppointments();
  const { business } = useBusiness();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  if (!appointment) return null;
  const dt = new Date(appointment.date);

  // Fetch available slots when date changes
  const fetchAvailability = async (date: Date) => {
    if (!business) return;
    setSlotsLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const staffParam = appointment.staffName ? `&staffName=${encodeURIComponent(appointment.staffName)}` : "";
      
      // Find service ID by matching service name
      const service = business.services.find(s => s.name === appointment.service);
      if (!service) {
        toast.error("Service not found", {
          description: "Could not find the service for this appointment.",
        });
        setAvailableSlots([]);
        return;
      }
      
      const data = await apiFetch<{ success: boolean; slots: string[] }>(
        `/availability?date=${dateStr}&serviceId=${service._id}${staffParam}`
      );
      if (data.success) {
        setAvailableSlots(data.slots);
        if (data.slots.length > 0 && !data.slots.includes(selectedTime)) {
          setSelectedTime(data.slots[0]);
        }
      }
    } catch (err: any) {
      toast.error("Failed to load available slots", {
        description: err.message || "Please try again.",
      });
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    setAvailableSlots([]);
    if (date) {
      fetchAvailability(date);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelAppointment(appointment.id);
      toast.success("Appointment cancelled", {
        description: "The booking has been cancelled successfully.",
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to cancel appointment", {
        description: err.message || "Please try again later.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleMode) {
      setRescheduleMode(true);
      setSelectedDate(new Date(dt));
      fetchAvailability(new Date(dt));
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setIsRescheduling(true);
    try {
      const newDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":").map(Number);
      newDate.setHours(hours, minutes);
      
      await updateAppointment(appointment.id, { date: newDate.toISOString() });
      toast.success("Appointment rescheduled", {
        description: `Successfully rescheduled to ${format(newDate, "PPP")} at ${selectedTime}`,
      });
      setRescheduleMode(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to reschedule appointment", {
        description: err.message || "Please try again later.",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelReschedule = () => {
    setRescheduleMode(false);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
  };

  return appointment.status === "cancelled" ? (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Cancelled</DialogTitle>
          <DialogDescription>This appointment has been cancelled and cannot be modified.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Row icon={Suitcase} label="Service" value={appointment.service} />
          <Row
            icon={Calendar}
            label="Date"
            value={dt.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          />
          <Row
            icon={ClockCircle}
            label="Time"
            value={`${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${appointment.durationMinutes}m`}
          />
          {appointment.staffName && <Row icon={User} label="Staff" value={appointment.staffName} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{appointment.customer}</DialogTitle>
            <Badge
              variant={
                appointment.status === "confirmed"
                  ? "default"
                  : appointment.status === "pending"
                    ? "secondary"
                    : "destructive"
              }
            >
              {appointment.status}
            </Badge>
          </div>
          <DialogDescription>
            {rescheduleMode ? "Select new date and time" : "Appointment details"}
          </DialogDescription>
        </DialogHeader>

        {!rescheduleMode ? (
          <div className="space-y-3 text-sm">
            <Row icon={Suitcase} label="Service" value={appointment.service} />
            <Row
              icon={Calendar}
              label="Date"
              value={dt.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            />
            <Row
              icon={ClockCircle}
              label="Time"
              value={`${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${appointment.durationMinutes}m`}
            />
            {appointment.staffName && <Row icon={User} label="Staff" value={appointment.staffName} />}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>New Time</Label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={slotsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={slotsLoading ? "Loading times..." : "Select time"} />
                </SelectTrigger>
                <SelectContent>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                      <Refresh className="h-3.5 w-3.5 animate-spin" />
                      Loading available times…
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No availability on this date
                    </div>
                  ) : (
                    availableSlots.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          {rescheduleMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelReschedule}
                disabled={isRescheduling}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={isRescheduling || !selectedDate || !selectedTime}
              >
                {isRescheduling ? (
                  <>
                    <Refresh className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleReschedule}
                disabled={isCancelling || isRescheduling}
              >
                Reschedule
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling || isRescheduling}
              >
                {isCancelling ? (
                  <>
                    <Refresh className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel booking"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
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
