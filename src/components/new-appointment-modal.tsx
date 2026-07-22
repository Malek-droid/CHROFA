import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments } from "@/lib/appointment-context";
import { useBusiness } from "@/lib/business-context";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Suitcase, Refresh, DangerCircle } from "@solar-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

/**
 * Create a UTC Date object corresponding to a local date and time in a specific IANA timezone.
 */
function getLocalDateInTimezone(date: Date, timeStr: string, timezone: string): Date {
  const dateStr = format(date, "yyyy-MM-dd");
  const [hours, minutes] = timeStr.split(":").map(Number);

  const [year, month, day] = dateStr.split("-").map(Number);
  const tempDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(tempDate);
  let tzYear = year,
    tzMonth = month,
    tzDay = day,
    tzHour = hours,
    tzMinute = minutes;
  for (const part of parts) {
    if (part.type === "year") tzYear = parseInt(part.value, 10);
    else if (part.type === "month") tzMonth = parseInt(part.value, 10);
    else if (part.type === "day") tzDay = parseInt(part.value, 10);
    else if (part.type === "hour") tzHour = parseInt(part.value, 10);
    else if (part.type === "minute") tzMinute = parseInt(part.value, 10);
  }

  if (tzHour === 24) tzHour = 0;

  const targetUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const formattedUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
  const diffMs = targetUtc - formattedUtc;

  return new Date(tempDate.getTime() + diffMs);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NewAppointmentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { addAppointment } = useAppointments();
  const { business, isLoading: businessLoading, error: businessError } = useBusiness();

  // Derive real services and staff from the business document.
  // business.services[n]._id is a Mongoose ObjectId string — use String(_id) as the
  // Select value so lookups are consistent. business.staff[n].name is sent directly
  // as staffName (denormalized string per the Appointment schema contract).
  const services = business?.services ?? [];
  const staffList = business?.staff ?? [];

  // ── Form state ─────────────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  // serviceId holds the string version of a service's _id.
  // Initialised to "" — reset to the first real service once business data loads.
  const [serviceId, setServiceId] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Availability state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  // Set default serviceId once the business data arrives (or when the modal first
  // opens after data is already loaded). Only sets the default if serviceId is still
  // empty (avoids overwriting a user's deliberate selection on re-render).
  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      setServiceId(String(services[0]._id));
    }
  }, [services, serviceId]);

  // Fetch available slots whenever date, service, staff, or refetch counter changes
  useEffect(() => {
    if (!open) return;
    if (!selectedDate || !serviceId || !business) {
      setAvailableSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const staffParam =
          staffName && staffName !== "none" ? `&staffName=${encodeURIComponent(staffName)}` : "";
        const data = await apiFetch<{ success: boolean; slots: string[] }>(
          `/availability?date=${dateStr}&serviceId=${serviceId}${staffParam}`,
        );
        if (data.success) {
          setAvailableSlots(data.slots);
          if (data.slots.length > 0) {
            // Keep current selected time if it's still available, else default to the first slot.
            if (!data.slots.includes(selectedTime)) {
              setSelectedTime(data.slots[0]);
            }
          } else {
            setSelectedTime("");
          }
        }
      } catch (err: any) {
        console.error("[Availability Fetch Error]", err);
        setSlotsError(err.message || "Failed to load available slots");
        setAvailableSlots([]);
        setSelectedTime("");
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, serviceId, staffName, open, business, refetchCounter]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    // ─ Validate ──────────────────────────────────────────────────────────────
    if (!customerName.trim()) {
      toast.error("Please enter a customer name");
      return;
    }
    if (!customerEmail.trim()) {
      toast.error("Please enter the customer's email address");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(customerEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!serviceId) {
      toast.error("Please select a service");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a time");
      return;
    }

    // Find the full service object from the real business services list.
    const selectedServiceObj = services.find((s) => String(s._id) === serviceId);
    if (!selectedServiceObj || !business) {
      toast.error("Invalid service selected");
      return;
    }

    // ─ Build ISO timestamp in business's timezone ─────────────────────────────
    const finalDate = getLocalDateInTimezone(selectedDate, selectedTime, business.timezone);

    // ─ POST to backend ────────────────────────────────────────────────────────
    // staffName is the raw name string — the Appointment schema stores it
    // denormalized (not a staff _id), so we pass the name directly.
    setSubmitting(true);
    try {
      await addAppointment({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        service: selectedServiceObj.name, // real service name from DB
        date: finalDate.toISOString(),
        staffName: staffName && staffName !== "none" ? staffName : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Appointment booked", {
        description: `${selectedServiceObj.name} for ${customerName} on ${format(finalDate, "PPP")} at ${selectedTime}`,
      });

      // ─ Reset ─────────────────────────────────────────────────────────────────
      setCustomerName("");
      setCustomerEmail("");
      // Reset to first real service (not a hardcoded mock id)
      setServiceId(services.length > 0 ? String(services[0]._id) : "");
      setStaffName("");
      setSelectedDate(new Date());
      setSelectedTime("");
      setNotes("");
      onOpenChange(false);
    } catch (err: any) {
      if (err.status === 409) {
        toast.error("That slot was just booked by someone else — please pick another time");
        // Re-fetch availability list automatically
        setRefetchCounter((prev) => prev + 1);
      } else {
        const message = err?.message ?? "Failed to book appointment. Please try again.";
        toast.error("Booking failed", { description: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // The current service object drives the duration display.
  // Uses durationMinutes (real schema field), not the old mock-data `.duration` alias.
  const currentService = services.find((s) => String(s._id) === serviceId);

  // ─── Loading / error states ────────────────────────────────────────────────
  const formDisabled = submitting || businessLoading || !!businessError;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Fill in the details to schedule a new customer booking.
          </DialogDescription>
        </DialogHeader>

        {/* Business data loading state */}
        {businessLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Refresh className="h-4 w-4 animate-spin" />
            Loading business data…
          </div>
        )}

        {/* Business data error state */}
        {!businessLoading && businessError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <DangerCircle className="h-4 w-4 shrink-0" />
            <span>Could not load services: {businessError}</span>
          </div>
        )}

        {/* Form — only rendered once business data is available */}
        {!businessLoading && !businessError && (
          <div className="grid gap-4 py-4">
            {/* Customer name + email (two-column) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="customerName"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  data-testid="customer-name-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah Lin"
                  disabled={formDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="customerEmail"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerEmail"
                  data-testid="customer-email-input"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. sarah@example.com"
                  disabled={formDisabled}
                />
              </div>
            </div>

            {/* Service & Staff selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 min-w-0">
                <Label
                  htmlFor="service"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Service
                </Label>
                <Select value={serviceId} onValueChange={setServiceId} disabled={formDisabled}>
                  <SelectTrigger
                    id="service"
                    data-testid="service-select-trigger"
                    className="w-full cursor-pointer overflow-hidden"
                  >
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">
                        No services configured for this business.
                      </div>
                    ) : (
                      services.map((s) => (
                        <SelectItem
                          key={String(s._id)}
                          value={String(s._id)}
                          className="cursor-pointer"
                        >
                          {s.name} · {s.durationMinutes}m
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 min-w-0">
                <Label
                  htmlFor="staff"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Staff Member
                </Label>
                <Select value={staffName} onValueChange={setStaffName} disabled={formDisabled}>
                  <SelectTrigger
                    id="staff"
                    data-testid="staff-select-trigger"
                    className="w-full cursor-pointer overflow-hidden"
                  >
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="none"
                      className="cursor-pointer text-muted-foreground italic"
                    >
                      No preference
                    </SelectItem>
                    {staffList.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground">
                        No staff configured for this business.
                      </div>
                    ) : (
                      staffList.map((member) => (
                        <SelectItem
                          key={String(member._id)}
                          value={member.name} // staffName is stored as a name string, not _id
                          className="cursor-pointer"
                        >
                          {member.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 min-w-0">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="date-picker-trigger"
                      disabled={formDisabled}
                      className={cn(
                        "w-full justify-start text-left font-normal cursor-pointer min-w-0",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={{ before: new Date() }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2 min-w-0">
                <Label
                  htmlFor="time"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Time
                </Label>
                <Select
                  value={selectedTime}
                  onValueChange={setSelectedTime}
                  disabled={formDisabled || slotsLoading}
                >
                  <SelectTrigger
                    id="time"
                    data-testid="time-select-trigger"
                    className="w-full cursor-pointer overflow-hidden"
                  >
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
                        <SelectItem key={t} value={t} className="cursor-pointer">
                          {t}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration indicator — uses real durationMinutes field */}
            {currentService && (
              <div className="flex items-center gap-2 rounded-md bg-muted/30 border border-muted p-2 text-xs text-muted-foreground">
                <Suitcase className="h-3.5 w-3.5" />
                <span>
                  Service duration: <strong>{currentService.durationMinutes} minutes</strong>
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label
                htmlFor="notes"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                data-testid="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any specific details or preferences..."
                className="resize-none"
                rows={3}
                disabled={formDisabled}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            data-testid="book-appointment-cancel"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            data-testid="book-appointment-submit"
            disabled={
              formDisabled || services.length === 0 || !selectedTime || availableSlots.length === 0
            }
            className="cursor-pointer bg-primary text-primary-foreground hover:opacity-90"
          >
            {submitting ? (
              <>
                <Refresh className="mr-2 h-4 w-4 animate-spin" />
                Booking…
              </>
            ) : (
              "Book appointment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
