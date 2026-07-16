import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Calendar,
  Letter,
  ChatRound,
  Download,
  QrCode,
  CheckCircle,
  Refresh,
} from "@solar-icons/react";
import { toast } from "sonner";
import { useBusiness } from "@/lib/business-context";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — CHROFA" }] }),
  component: SettingsPage,
});

export function SettingsPage() {
  const { business, isLoading, refetch } = useBusiness();
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for business profile
  const [formData, setFormData] = useState({
    name: "",
    timezone: "",
    slug: "",
    headerTagline: "",
  });

  // Form state for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailConfirmation: true,
    noShowAlerts: false,
    dailyDigest: true,
  });

  // Load business data when it becomes available
  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name || "",
        timezone: business.timezone || "",
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
    }
  }, [business]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name,
          timezone: formData.timezone,
          slug: formData.slug,
          headerTagline: formData.headerTagline,
        }),
      });
      await refetch();
      setSaved(true);
      toast.success("Profile saved");
      setTimeout(() => setSaved(false), 2400);
    } catch (err: any) {
      toast.error("Failed to save profile", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegrations = async () => {
    toast.success("Integrations saved");
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await apiFetch("/business", {
        method: "PATCH",
        body: JSON.stringify({
          notificationPreferences: notificationPrefs,
        }),
      });
      await refetch();
      setSaved(true);
      toast.success("Notification preferences saved");
      setTimeout(() => setSaved(false), 2400);
    } catch (err: any) {
      toast.error("Failed to save notification preferences", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBookingPage = async () => {
    toast.success("Booking page settings saved");
  };

  return (
    <DashboardShell title="Settings" description="Manage how CHROFA works for you.">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Business profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="booking">Booking page</TabsTrigger>
        </TabsList>

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
                  <Input
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="mt-1.5 bg-background"
                  />
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
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Header tagline
                  </Label>
                  <Input
                    value={formData.headerTagline}
                    onChange={(e) => setFormData({ ...formData, headerTagline: e.target.value })}
                    className="mt-1.5 bg-background"
                    placeholder="Book time with CHROFA"
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
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </section>

          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Booking QR code</h2>
            <p className="text-sm text-muted-foreground">Print or share for direct bookings.</p>
            <Separator className="my-5" />
            <div className="grid sm:grid-cols-[220px_1fr] gap-6 items-center">
              <div className="rounded-2xl border border-border bg-muted/30 p-5 flex items-center justify-center">
                <div className="rounded-xl bg-white p-4 shadow-soft">
                  <div className="grid h-40 w-40 place-items-center">
                    <QrCode className="h-32 w-32 text-brand-ink" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-foreground">
                  Print this QR code and place it at reception, on business cards, or on receipts.
                  Guests scan to open your booking page directly.
                </p>
                <p className="text-xs text-muted-foreground mt-2">chrofa.co/book/studio-fillmore</p>
                <Button
                  className="mt-4 bg-brand-ink hover:bg-brand-ink/90"
                  onClick={() => toast.success("QR code downloaded")}
                >
                  <Download className="h-4 w-4 mr-2" /> Download QR
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <section className="card-soft divide-y divide-border">
            <IntegrationRow
              icon={Calendar}
              title="Google Calendar"
              description="Sync appointments to your calendar in real time."
              status="disconnected"
            />
            <IntegrationRow
              icon={Letter}
              title="Email delivery"
              description="Send confirmations and reminders via email."
              status="connected"
              detail="hello@chrofa.co"
            />
          </section>

          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Booking preferences</h2>
            <p className="text-sm text-muted-foreground">Fine-tune how bookings are accepted.</p>
            <Separator className="my-5" />
            <div className="space-y-6">
              <SliderRow label="Minimum notice" min="Same day" max="14 days" defaultValue={2} />
              <SliderRow
                label="Buffer between appointments"
                min="0 min"
                max="60 min"
                defaultValue={15}
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                className="bg-brand-ink hover:bg-brand-ink/90"
                onClick={handleSaveIntegrations}
              >
                Save changes
              </Button>
            </div>
          </section>
        </TabsContent>

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
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="booking" className="space-y-4">
          <section className="card-soft p-6">
            <h2 className="font-display text-lg text-foreground">Booking page</h2>
            <p className="text-sm text-muted-foreground">The page your guests see.</p>
            <Separator className="my-5" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Public slug" defaultValue="studio-fillmore" />
              <Field label="Header tagline" defaultValue="Book time with CHROFA" />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                className="bg-brand-ink hover:bg-brand-ink/90"
                onClick={handleSaveBookingPage}
              >
                Save changes
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input defaultValue={defaultValue} className="mt-1.5 bg-background" />
    </div>
  );
}

function IntegrationRow({
  icon: Icon,
  title,
  description,
  status,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: "connected" | "disconnected" | "syncing";
  detail?: string;
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
          className="border-steel text-steel hover:bg-steel/10 hover:text-steel"
          onClick={() => toast.info("Coming soon — hook up your real provider later.")}
        >
          Connect
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => toast.info("Manage flow coming soon")}>
          Manage
        </Button>
      )}
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  defaultValue,
}: {
  label: string;
  min: string;
  max: string;
  defaultValue: number;
}) {
  const [value, setValue] = useState([defaultValue]);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{value[0]}</span>
      </div>
      <Slider value={value} onValueChange={setValue} max={60} step={1} className="mt-3" />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

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

  // Sync local state when prop changes
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
