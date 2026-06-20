import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, CalendarRange, BellRing, ShieldCheck, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cadence — Smart appointment scheduling powered by AI" },
      { name: "description", content: "AI-powered appointment scheduling for salons, clinics, and consultants. Book by chat or calendar." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Now in private beta
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Smart appointment scheduling powered by AI
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Let customers book in seconds through natural conversation, or pick a slot the
            classic way. Cadence keeps your calendar tidy and your business in motion.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/book">
                Start booking <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Business dashboard</Link>
            </Button>
          </div>

          {/* Preview card */}
          <div className="mx-auto mt-16 max-w-4xl rounded-xl border border-border bg-card/50 p-2 shadow-2xl shadow-primary/10">
            <div className="rounded-lg border border-border bg-background p-6 text-left">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Chat</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-muted/60 px-3 py-2 text-foreground">Can I get a haircut Tuesday morning?</div>
                    <div className="rounded-md bg-primary/15 px-3 py-2 text-foreground">Tuesday 9:30am or 10:15am — which works?</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Calendar</p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`h-8 rounded ${[2, 5, 9, 11].includes(i) ? "bg-primary/30" : "bg-muted/60"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to keep the day flowing
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: MessageSquare, title: "AI chat booking", body: "Customers book in plain language. The assistant understands intent, suggests slots, confirms." },
              { icon: CalendarRange, title: "Smart calendar", body: "A live weekly view with conflict detection and gentle nudges to fill the gaps." },
              { icon: BellRing, title: "Automated reminders", body: "Email and SMS reminders reduce no-shows without lifting a finger." },
              { icon: ShieldCheck, title: "Reliable by default", body: "Built for service businesses that can't afford a missed booking." },
              { icon: Zap, title: "Fast everywhere", body: "Snappy on desktop, comfortable on mobile. No friction in the moment of decision." },
              { icon: LineChart, title: "Clear analytics", body: "Understand demand, cancellations, and no-show risk at a glance." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-card p-6">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Ready when you are</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Set up your business in minutes. No credit card required to try.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link to="/signup">Create account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/book">See it in action</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} Cadence Inc.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
