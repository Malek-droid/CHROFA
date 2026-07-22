import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Letter,
  CheckCircle,
  Refresh,
  Download,
  ClockCircle,
  CalendarMark,
} from "@solar-icons/react";
import { toast } from "sonner";
import { useBusiness } from "@/lib/business-context";
import { apiFetch, API_BASE } from "@/lib/api";
import { CURRENCIES } from "@/lib/currency";
import { TIMEZONES } from "@/lib/timezones";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — CHROFA" }] }),
  component: SettingsPage,
});

// Day names for the schedule editor (0 = Sunday)
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayHours {
  day: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export function SettingsPage() {
  const { business, isLoading, refetch } = useBusiness();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Business profile state ────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: "",
    timezone: "",
    currency: "USD",
    slug: "",
    headerTagline: "",
  });

  // ── Booking preferences state ─────────────────────────────────────────────
  const [minNotice, setMinNotice] = useState([2]);
  const [bufferMinutes, setBufferMinutes] = useState([15]);

  // ── Schedule / opening hours state ────────────────────────────────────────
  const [hours, setHours] = useState<DayHours[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day: i,
      isOpen: i >= 1 && i <= 5, // Mon–Fri open by default
      openTime: "09:00",
      closeTime: "18:00",
    })),
  );

  // ── Notification preferences state ────────────────────────────────────────
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailConfirmation: true,
    noShowAlerts: false,
    dailyDigest: true,
  });

  // ── Email test modal state ─────────────────────────────────────────────────
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // ── QR code state ─────────────────────────────────────────────────────────
  const qrImgRef = useRef<HTMLImageElement>(null);
  const [qrError, setQrError] = useState(false);

  // ── Populate form from business data ──────────────────────────────────────
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || "",
        timezone: business.timezone || "",
        currency: (business as any).currency || "USD",
        slug: business.slug || "",
        headerTagline: business.headerTagline || "",
      });
      if (business.notificationPreferences) {
        setNotificationPrefs({
          emailConfirmation: business.notificationPreferences.emailConfirmation ?? true,
          noShowAlerts: business.notificationPreferences.noShowAlerts ?? false,
          dailyDigest: business.notificationPreferences.dailyDigest ?? true,
        });
      }
      if (business.bookingPreferences) {
        setMinNotice([business.bookingPreferences.minNoticeHours ?? 2]);
        setBufferMinutes([business.bookingPreferences.defaultBufferMinutes ?? 15]);
      }
      if (business.openingHours && business.openingHours.length === 7) {
        setHours(
          business.openingHours.map((h: any) => ({
            day: h.day,
            isOpen: h.isOpen,
            openTime: h.openTime || "09:00",
            closeTime: h.closeTime || "18:00",
          })),
        );
      }
      // Pre-fill test email with owner's identifier if available
      if (!testEmailTo && (business as any).ownerEmail) {
        setTestEmailTo((business as any).ownerEmail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "calendar_connected") {
        toast.success("Google Calendar connected successfully!");
        refetch();
        window.history.replaceState({}, "", window.location.pathname);
      } else if (params.get("error") === "calendar_auth_failed") {
        toast.error("Google Calendar connection failed. Please try again.");
        window.history.replaceState({}, "", window.location.pathname);
      } else if (params.get("error") === "no_refresh_token") {
        toast.error("Google Calendar connection requires full offline access permission.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [refetch]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDisconnectCalendar = async () => {
    try {
      await apiFetch("/calendar/disconnect", { method: "POST" });
      toast.success("Google Calendar disconnected.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect Google Calendar.");
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          currency: formData.currency,
          slug: formData.slug,
          headerTagline: formData.headerTagline,
        }),
      });
      await refetch();
      flashSaved();
      toast.success("Profile saved");
    } catch (err: any) {
      const code = err?.code;
      if (code === "SLUG_COLLISION") {
        toast.error("Slug already taken", {
          description: "Please choose a different booking page URL.",
        });
      } else {
        toast.error("Failed to save profile", { description: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBookingPrefs = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({
          bookingPreferences: {
            minNoticeHours: minNotice[0],
            defaultBufferMinutes: bufferMinutes[0],
          },
        }),
      });
      await refetch();
      flashSaved();
      toast.success("Booking preferences saved");
    } catch (err: any) {
      toast.error("Failed to save booking preferences", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({ openingHours: hours }),
      });
      await refetch();
      flashSaved();
      toast.success("Schedule saved");
    } catch (err: any) {
      toast.error("Failed to save schedule", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({ notificationPreferences: notificationPrefs }),
      });
      await refetch();
      flashSaved();
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error("Failed to save notification preferences", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      await apiFetch("/business/test-email", {
        method: "POST",
        body: JSON.stringify({ to: testEmailTo }),
      });
      toast.success("Test email sent!", {
        description: `Check your inbox at ${testEmailTo}.`,
      });
      setEmailModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to send test email", { description: err.message });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!business?._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/business/${business._id}/qr`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch QR code");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${business.slug || business._id}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  };

  const updateHour = (day: number, field: keyof DayHours, value: string | boolean) => {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, [field]: value } : h)));
  };

  // Build the QR code URL for display (it's a public endpoint, no auth needed)
  const qrSrc = business?._id ? `/api/business/${business._id}/qr` : null;
  const bookingUrl = business
    ? `${window.location.origin}/book/${business.slug || business._id}`
    : "";

  // Ensure current timezone is always in the list
  const timezoneOptions = [...TIMEZONES];
  if (formData.timezone && !timezoneOptions.some((t) => t.value === formData.timezone)) {
    timezoneOptions.unshift({ value: formData.timezone, label: formData.timezone });
  }

  return (
    <DashboardShell title="Settings" description="Manage how CHROFA works for you.">
      {/* Test email dialog */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Verify that appointment confirmations, reminders, and digests are delivered correctly
              by sending a test message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label
              htmlFor="test-email-to"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Recipient email
            </Label>
            <Input
              id="test-email-to"
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="you@example.com"
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-brand-ink hover:bg-brand-ink/90"
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail || !testEmailTo}
            >
              {sendingTestEmail ? (
                <>
                  <Refresh className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send test email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Business profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        {/* ── Business Profile tab ─────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6">
          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Business profile</h2>
            <p className="text-sm text-muted-foreground">How customers see your business.</p>
            <Separator className="my-5" />
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Refresh className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Business name
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 bg-background"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Time zone
                  </Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                  >
                    <SelectTrigger className="mt-1.5 bg-background">
                      <SelectValue placeholder="Select timezone…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {timezoneOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Public slug
                  </Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="mt-1.5 bg-background"
                    placeholder="studio-fillmore"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Your booking link: /book/
                    <span className="font-mono">{formData.slug || "your-slug"}</span>
                  </p>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Currency
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger className="mt-1.5 bg-background">
                      <SelectValue placeholder="Select currency…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Header tagline
                  </Label>
                  <Input
                    value={formData.headerTagline}
                    onChange={(e) => setFormData({ ...formData, headerTagline: e.target.value })}
                    className="mt-1.5 bg-background"
                    placeholder="Book time with us"
                  />
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-status-confirmed-fg animate-fade-in">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button
                className="bg-brand-ink hover:bg-brand-ink/90"
                onClick={handleSaveProfile}
                disabled={saving || isLoading}
              >
                {saving ? (
                  <>
                    <Refresh className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </section>

          {/* QR code section */}
          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Booking QR code</h2>
            <p className="text-sm text-muted-foreground">Print or share for direct bookings.</p>
            <Separator className="my-5" />
            <div className="grid sm:grid-cols-[220px_1fr] gap-6 items-center">
              <div className="rounded-2xl border border-border bg-muted/30 p-5 flex items-center justify-center">
                <div className="rounded-xl bg-white p-4 shadow-soft">
                  {qrSrc && !qrError ? (
                    <img
                      ref={qrImgRef}
                      src={qrSrc}
                      alt="Booking QR code"
                      className="h-40 w-40 object-contain"
                      onError={() => setQrError(true)}
                    />
                  ) : (
                    <div className="grid h-40 w-40 place-items-center text-muted-foreground text-xs text-center">
                      {qrError
                        ? "Could not load QR code.\nMake sure the server is running."
                        : "QR code loading\u2026"}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-foreground">
                  Print this QR code and place it at reception, on business cards, or on receipts.
                  Guests scan to open your booking page directly.
                </p>
                {bookingUrl && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                    {bookingUrl}
                  </p>
                )}
                <Button
                  className="mt-4 bg-brand-ink hover:bg-brand-ink/90"
                  onClick={handleDownloadQR}
                  disabled={!business?._id}
                >
                  <Download className="h-4 w-4 mr-2" /> Download QR
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* ── Integrations tab ─────────────────────────────────────────────── */}
        <TabsContent value="integrations" className="space-y-4">
          <section className="card-soft divide-y divide-border">
            <IntegrationRow
              icon={Calendar}
              title="Google Calendar"
              description="Sync appointments to your calendar in real time."
              status={business?.googleCalendarConnected ? "connected" : "disconnected"}
              detail={
                business?.googleCalendarConnected && business?.googleCalendarConnectedEmail
                  ? `Connected as ${business.googleCalendarConnectedEmail}`
                  : undefined
              }
              onConnect={() => {
                const base = API_BASE.replace("/api", "");
                window.location.href = `${base}/api/calendar/connect`;
              }}
              onDisconnect={handleDisconnectCalendar}
            />
            <IntegrationRow
              icon={Letter}
              title="Email delivery"
              description="Send confirmations and reminders via email."
              status="connected"
              detail="Configured via SMTP / Gmail"
              onManage={() => setEmailModalOpen(true)}
            />
          </section>

          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Booking preferences</h2>
            <p className="text-sm text-muted-foreground">Fine-tune how bookings are accepted.</p>
            <Separator className="my-5" />
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <ClockCircle className="h-4 w-4 text-muted-foreground" />
                    Minimum notice
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {minNotice[0] === 0 ? "Same day" : `${minNotice[0]}h`}
                  </span>
                </div>
                <Slider
                  value={minNotice}
                  onValueChange={setMinNotice}
                  min={0}
                  max={72}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>Same day</span>
                  <span>72 hours</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Customers won't be able to book slots less than{" "}
                  {minNotice[0] === 0
                    ? "the current time"
                    : `${minNotice[0]} hour${minNotice[0] !== 1 ? "s" : ""}`}{" "}
                  from now.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <CalendarMark className="h-4 w-4 text-muted-foreground" />
                    Buffer between appointments
                  </span>
                  <span className="text-muted-foreground font-mono">{bufferMinutes[0]}min</span>
                </div>
                <Slider
                  value={bufferMinutes}
                  onValueChange={setBufferMinutes}
                  min={0}
                  max={60}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>No buffer</span>
                  <span>60 min</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  A gap applied after each appointment so you have time to prepare for the next.
                  Applied as a fallback when a service has no specific buffer configured.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-status-confirmed-fg animate-fade-in">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button
                className="bg-brand-ink hover:bg-brand-ink/90"
                onClick={handleSaveBookingPrefs}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Refresh className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* ── Notifications tab ────────────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-4">
          <section className="card-soft p-6 divide-y divide-border">
            <ToggleRow
              title="Email confirmations"
              description="Send a receipt when a booking is created."
              checked={notificationPrefs.emailConfirmation}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, emailConfirmation: checked })
              }
            />
            <ToggleRow
              title="Cancellation alerts"
              description="Notify me when a guest cancels."
              checked={notificationPrefs.noShowAlerts}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, noShowAlerts: checked })
              }
            />
            <ToggleRow
              title="Weekly digest"
              description="A calm weekly summary of activity."
              checked={notificationPrefs.dailyDigest}
              onCheckedChange={(checked) =>
                setNotificationPrefs({ ...notificationPrefs, dailyDigest: checked })
              }
            />
          </section>
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-status-confirmed-fg animate-fade-in">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
            <Button
              className="bg-brand-ink hover:bg-brand-ink/90"
              onClick={handleSaveNotifications}
              disabled={saving || isLoading}
            >
              {saving ? (
                <>
                  <Refresh className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ── Schedule tab ─────────────────────────────────────────────────── */}
        <TabsContent value="schedule" className="space-y-4">
          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Business hours</h2>
            <p className="text-sm text-muted-foreground">
              Set when you're open each day. The availability engine uses these hours to calculate
              bookable slots.
            </p>
            <Separator className="my-5" />
            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-4">
              {hours.map((h) => (
                <div key={h.day} className="flex items-center gap-3 py-1.5">
                  <div className="w-24 shrink-0">
                    <span className="text-sm font-medium text-foreground">{DAY_NAMES[h.day]}</span>
                  </div>

                  {/* Open/closed toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={h.isOpen}
                    onClick={() => updateHour(h.day, "isOpen", !h.isOpen)}
                    className={[
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                      h.isOpen ? "bg-primary" : "bg-input",
                    ].join(" ")}
                    aria-label={`${DAY_NAMES[h.day]} open/closed`}
                  >
                    <span
                      className={[
                        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                        h.isOpen ? "translate-x-4" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>

                  {h.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={h.openTime}
                        onChange={(e) => updateHour(h.day, "openTime", e.target.value)}
                        className="h-8 w-28 text-sm bg-background"
                        aria-label={`${DAY_NAMES[h.day]} opening time`}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={h.closeTime}
                        onChange={(e) => updateHour(h.day, "closeTime", e.target.value)}
                        className="h-8 w-28 text-sm bg-background"
                        aria-label={`${DAY_NAMES[h.day]} closing time`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-status-confirmed-fg animate-fade-in">
                  <CheckCircle className="h-4 w-4" /> Saved
                </span>
              )}
              <Button
                className="bg-brand-ink hover:bg-brand-ink/90"
                onClick={handleSaveSchedule}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Refresh className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save schedule"
                )}
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

// ─── Integration row ──────────────────────────────────────────────────────────

function IntegrationRow({
  icon: Icon,
  title,
  description,
  status,
  detail,
  onConnect,
  onDisconnect,
  onManage,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: "connected" | "disconnected" | "syncing";
  detail?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onManage?: () => void;
}) {
  const statusMap = {
    connected: {
      label: "Connected",
      className: "bg-status-confirmed text-status-confirmed-fg border-status-confirmed-fg/15",
    },
    disconnected: {
      label: "Not connected",
      className: "bg-muted text-muted-foreground border-border",
    },
    syncing: {
      label: "Syncing",
      className: "bg-status-pending text-status-pending-fg border-status-pending-fg/15",
    },
  } as const;

  return (
    <div className="flex items-center gap-4 p-6">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-brand-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <Badge
            variant="outline"
            className={statusMap[status].className + " rounded-full font-normal text-[11px]"}
          >
            {statusMap[status].label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">{detail ?? description}</div>
      </div>
      {status === "disconnected" ? (
        <Button
          variant="outline"
          className="border-brand-ink text-brand-ink hover:bg-brand-ink/10 hover:text-brand-ink"
          onClick={onConnect ?? (() => toast.info("Coming soon — hook up your real provider later."))}
        >
          Connect
        </Button>
      ) : (
        <Button
          variant={onDisconnect ? "outline" : "ghost"}
          className={onDisconnect ? "text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10" : undefined}
          onClick={onDisconnect ?? onManage ?? (() => toast.info("Manage flow coming soon"))}
        >
          {onDisconnect ? "Disconnect" : "Manage"}
        </Button>
      )}
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const [localChecked, setLocalChecked] = useState(checked ?? false);

  const handleChange = (newChecked: boolean) => {
    setLocalChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  useEffect(() => {
    setLocalChecked(checked ?? false);
  }, [checked]);

  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={localChecked} onCheckedChange={handleChange} />
    </div>
  );
}
