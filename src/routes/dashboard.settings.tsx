import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Cadence" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <DashboardShell title="Settings">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-1 text-sm">
          {["Business profile", "Integrations", "Notifications"].map((s, i) => (
            <a
              key={s}
              href={`#section-${i}`}
              className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {s}
            </a>
          ))}
        </nav>

        <div className="space-y-6">
          {/* Profile */}
          <section id="section-0" className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Business profile</h2>
            <p className="text-xs text-muted-foreground">How customers see your business.</p>
            <Separator className="my-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" defaultValue="Studio North" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+1 (415) 555-0142" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="open">Opening hours</Label>
                <Input id="open" defaultValue="Mon–Sat · 9:00 – 18:00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tz">Time zone</Label>
                <Input id="tz" defaultValue="America/Los_Angeles" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => toast.success("Profile saved")}>Save changes</Button>
            </div>
          </section>

          {/* Integrations */}
          <section id="section-1" className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Integrations</h2>
            <p className="text-xs text-muted-foreground">Connect the tools you already use.</p>
            <Separator className="my-4" />
            <div className="space-y-3">
              <IntegrationRow icon={CalendarDays} title="Google Calendar" description="Two-way sync with your team's calendar." action="Connect" />
              <IntegrationRow icon={Mail} title="Email provider" description="Send confirmations and receipts via your domain." action="Configure" />
              <IntegrationRow icon={MessageSquare} title="SMS provider" description="Deliver reminder texts through Twilio or similar." action="Configure" />
            </div>
          </section>

          {/* Notifications */}
          <section id="section-2" className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            <p className="text-xs text-muted-foreground">Choose what you and your customers receive.</p>
            <Separator className="my-4" />
            <div className="space-y-4">
              <ToggleRow title="Email confirmation" description="Send a confirmation email when a booking is made." defaultChecked />
              <ToggleRow title="SMS reminders" description="Text customers 24 hours before their appointment." defaultChecked />
              <ToggleRow title="No-show alerts" description="Notify the team when AI detects high no-show risk." />
              <ToggleRow title="Daily digest" description="Email a morning summary of the day's bookings." defaultChecked />
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function IntegrationRow({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Button size="sm" variant="outline">{action}</Button>
    </div>
  );
}

function ToggleRow({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
