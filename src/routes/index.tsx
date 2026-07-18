import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChatRound,
  CalendarDate,
  BellBing,
  ShieldCheck,
  Bolt,
  ChartSquare,
} from "@solar-icons/react";
import { motion } from "motion/react";
import { LandingNav } from "@/components/landing-nav";
import { BlurFade } from "@/components/blur-fade";
import { Marquee } from "@/components/marquee";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chrofa — Effortless appointment scheduling" },
      {
        name: "description",
        content:
          "Chrofa is calm, intelligent booking for service businesses. Let customers book by chat or by calendar — no chaos, just easy time.",
      },
      { property: "og:title", content: "Chrofa — Effortless appointment scheduling" },
      {
        property: "og:description",
        content: "Calm, intelligent booking for service businesses. Book by chat or by calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ChatRound,
    title: "AI chat booking",
    body: "Customers book in plain language. The assistant suggests slots and confirms.",
  },
  {
    icon: CalendarDate,
    title: "Smart calendar",
    body: "A live weekly view with conflict detection and gentle nudges to fill gaps.",
  },
  {
    icon: BellBing,
    title: "Automated reminders",
    body: "Email and SMS reminders reduce no-shows without lifting a finger.",
  },
  {
    icon: ShieldCheck,
    title: "Reliable by default",
    body: "Built for service businesses that can't afford a missed booking.",
  },
  {
    icon: Bolt,
    title: "Fast everywhere",
    body: "Snappy on desktop, comfortable on mobile. No friction, ever.",
  },
  {
    icon: ChartSquare,
    title: "Clear analytics",
    body: "Understand demand, cancellations, and no-show risk at a glance.",
  },
];

const marqueeLogos = [
  "NORTHWIND",
  "LUMEN & CO",
  "ATLAS STUDIO",
  "FIELDNOTE",
  "PARABOLA",
  "MERIDIAN",
  "HARBOR/LAB",
  "SIGNAL WORKS",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[420px] h-[720px] w-[1100px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--steel) 45%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-120px] top-24 h-[380px] w-[380px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--khaki) 60%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 pb-16 pt-20 md:pt-28 lg:grid-cols-12 lg:gap-10 lg:pb-24">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            <BlurFade inView={false} delay={0.05} yOffset={6} blur={6} duration={0.6}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-steel" />
                Now in private beta
              </span>
            </BlurFade>

            <h1 className="mt-8 text-5xl leading-[1.02] tracking-tight text-[#283044] dark:text-[#EBF5EE] md:text-7xl">
              <BlurFade
                inView={false}
                delay={0.15}
                yOffset={14}
                blur={10}
                duration={0.9}
                className="block"
              >
                <span className="font-medium text-[#BFA89E] dark:text-[#78A1BB]">Booking, made into</span>
              </BlurFade>
              <BlurFade
                inView={false}
                delay={0.35}
                yOffset={14}
                blur={10}
                duration={0.9}
                className="block"
              >
                <span className="font-black text-[#283044] dark:text-[#EBF5EE]">easy time.</span>
              </BlurFade>
            </h1>

            <BlurFade inView={false} delay={0.6} yOffset={10} blur={6} duration={0.8}>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Let customers book in seconds through natural conversation, or pick a slot the
                classic way. Chrofa keeps your calendar tidy and your business in motion.
              </p>
            </BlurFade>

            <BlurFade inView={false} delay={0.75} yOffset={10} blur={6} duration={0.8}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  to="/search"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-indigo/20 transition-opacity hover:opacity-90"
                >
                  Start booking
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
                >
                  Business dashboard
                </Link>
              </div>
            </BlurFade>
          </div>

          {/* Right: layered preview */}
          <div className="relative lg:col-span-5">
            <div className="relative mx-auto h-[440px] w-full max-w-[520px]">
              {/* Back layered card */}
              <div
                aria-hidden
                className="absolute right-6 top-6 h-full w-full rounded-3xl border border-border bg-mint/80 shadow-xl shadow-indigo/10"
                style={{ transform: "rotate(4deg)" }}
              />
              {/* Front card */}
              <div
                className="absolute inset-0 rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-indigo/20"
                style={{ transform: "rotate(-3deg)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Today
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-khaki/70" />
                    <span className="h-2 w-2 rounded-full bg-steel/70" />
                    <span className="h-2 w-2 rounded-full bg-taupe/50" />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-mint px-4 py-2.5 text-sm text-foreground">
                    Can I get a haircut Tuesday morning?
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    Tuesday 9:30am or 10:15am — which works?
                  </div>
                  <div className="max-w-[55%] rounded-2xl rounded-tl-md bg-mint px-4 py-2.5 text-sm text-foreground">
                    10:15 please.
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 18 }).map((_, i) => {
                    const filled = [2, 5, 6, 9, 11, 14, 16].includes(i);
                    return (
                      <div
                        key={i}
                        className={
                          "aspect-square rounded-md " + (filled ? "bg-steel/70" : "bg-mint")
                        }
                      />
                    );
                  })}
                </div>
              </div>

              {/* Floating stat chip */}
              <div
                className="absolute -bottom-6 -left-6 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl shadow-indigo/15"
                style={{ transform: "rotate(-6deg)" }}
              >
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  This week
                </div>
                <div className="mt-1 text-xl font-black text-foreground">
                  128 <span className="text-sm font-medium text-muted-foreground">booked</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted by — marquee */}
        <div className="relative mx-auto max-w-6xl px-6 pb-24">
          <BlurFade yOffset={8} blur={6} duration={0.8}>
            <div className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Trusted by teams at
            </div>
          </BlurFade>
          <div
            className="mt-8"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            }}
          >
            <Marquee duration={45} gap={64}>
              {marqueeLogos.map((logo) => (
                <div
                  key={logo}
                  className="flex h-8 items-center gap-2 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/70"
                >
                  <span className="h-2 w-2 rounded-full border border-border" />
                  {logo}
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-mint/40">
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <BlurFade yOffset={10} blur={6} duration={0.8}>
                <div className="text-xs font-medium uppercase tracking-widest text-steel">
                  Features
                </div>
              </BlurFade>
              <BlurFade delay={0.08} yOffset={12} blur={8} duration={0.9}>
                <h2 className="mt-4 text-4xl leading-tight tracking-tight text-[#283044] dark:text-[#EBF5EE] md:text-5xl">
                  <span className="font-medium text-[#BFA89E] dark:text-[#78A1BB]">Everything to keep</span>{" "}
                  <span className="font-black">the day flowing.</span>
                </h2>
              </BlurFade>
              <BlurFade delay={0.18} yOffset={10} blur={6} duration={0.8}>
                <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
                  A calm system for the moments that matter — booking, reminding, and understanding
                  your week.
                </p>
              </BlurFade>
            </div>
            <div className="md:col-span-7">
              <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <BlurFade key={f.title} delay={i * 0.09} yOffset={18} blur={8} duration={0.8}>
                      <motion.div
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="group rounded-2xl p-1 transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo/10"
                      >
                        <motion.div
                          whileHover={{ scale: 1.06, y: -2 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary shadow-md shadow-indigo/10 ring-1 ring-border transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-indigo/15"
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </motion.div>
                        <h3 className="mt-5 text-lg font-bold text-foreground">{f.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {f.body}
                        </p>
                      </motion.div>
                    </BlurFade>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border">
        {/* Soft steel glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--steel) 45%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[8%] top-[20%] h-[280px] w-[280px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--khaki) 55%, transparent), transparent 70%)",
          }}
        />
        {/* Subtle dot texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in oklab, var(--indigo) 22%, transparent) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 py-28 md:py-36">
          <BlurFade yOffset={16} blur={10} duration={0.9}>
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 rounded-3xl border border-border bg-card/60 shadow-xl shadow-indigo/10"
                style={{ transform: "rotate(-1.5deg)" }}
              />
              <div className="relative rounded-3xl border border-border bg-card p-10 shadow-2xl shadow-indigo/15 md:p-14">
                <div className="grid gap-8 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-8">
                    <h2 className="text-4xl leading-tight tracking-tight text-[#283044] dark:text-[#EBF5EE] md:text-6xl">
                      <span className="font-medium text-[#BFA89E] dark:text-[#78A1BB]">Ready</span>{" "}
                      <span className="font-black">when you are.</span>
                    </h2>
                    <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                      Set up your business in minutes. No credit card required to try.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
                    <Link
                      to="/signup"
                      className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Create account
                    </Link>
                    <Link
                      to="/search"
                      className="inline-flex items-center rounded-full border border-border bg-mint px-5 py-3 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
                    >
                      See it in action
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div aria-hidden className="h-7 w-20 rounded-md border border-dashed border-border" />
            <span>© {new Date().getFullYear()} Chrofa. Easy time.</span>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#privacy" className="transition-opacity hover:opacity-70">
              Privacy
            </a>
            <a href="#terms" className="transition-opacity hover:opacity-70">
              Terms
            </a>
            <a href="#contact" className="transition-opacity hover:opacity-70">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
