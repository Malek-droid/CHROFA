import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  AltArrowRight,
  ChatRound,
  Plain,
  Refresh,
  DangerCircle,
} from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/book/$businessId")({
  head: () => ({
    meta: [
      { title: "Book an appointment — CHROFA" },
      { name: "description", content: "Book your appointment in seconds." },
    ],
  }),
  component: BookingPage,
});

type BackendService = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
};

type BackendStaff = {
  id: string;
  name: string;
};

type BackendBusiness = {
  id: string;
  name: string;
  phone: string | null;
  timezone: string;
  currency?: string;
  slug: string | null;
  headerTagline: string | null;
  industry: string | null;
  openingHours: {
    day: number;
    isOpen: boolean;
    openTime: string | null;
    closeTime: string | null;
  }[];
  services: BackendService[];
  staff: BackendStaff[];
};

type AIResponse = {
  intent: string;
  message: string;
  extracted: Record<string, unknown>;
  proposedSlots: string[] | null;
  readyToBook: boolean;
};

type Service = BackendService;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Generate dynamic suggested prompts based on business services and industry.
 */
function generateSuggestedPrompts(business: BackendBusiness): string[] {
  const { services, industry } = business;
  const prompts: string[] = [];

  // Industry-specific prompt templates
  const industryTemplates: Record<string, string[]> = {
    salon_spa: [
      "Book a {service}",
      "What's your availability this week?",
      "Do you have any openings for {service}?",
      "What services do you offer?",
    ],
    clinic_medical: [
      "Schedule a {service}",
      "What times are available for {service}?",
      "Book an appointment this week",
      "What services do you offer?",
    ],
    legal_consulting: [
      "Book a consultation",
      "Schedule a {service}",
      "What's your availability this week?",
      "What services do you offer?",
    ],
    other: [
      "Book a {service}",
      "Check availability this week",
      "What services do you offer?",
      "How do I book an appointment?",
    ],
  };

  const templates = industryTemplates[industry || "other"] || industryTemplates.other;

  // Generate service-specific prompts
  if (services.length > 0) {
    const serviceNames = services.map((s) => s.name);
    const topServices = serviceNames.slice(0, 3); // Use top 3 services

    // Replace {service} placeholders with actual service names
    templates.forEach((template) => {
      if (template.includes("{service}") && topServices.length > 0) {
        // Generate a prompt for each top service, but cap total
        topServices.slice(0, 2).forEach((serviceName) => {
          const prompt = template.replace("{service}", serviceName);
          if (!prompts.includes(prompt)) {
            prompts.push(prompt);
          }
        });
      } else if (!template.includes("{service}")) {
        if (!prompts.includes(template)) {
          prompts.push(template);
        }
      }
    });
  } else {
    // Fallback prompts when no services configured
    prompts.push("What services do you offer?");
    prompts.push("Check availability this week");
    prompts.push("How do I book an appointment?");
  }

  // Ensure we have at least 3 prompts, cap at 6
  const minPrompts = 3;
  const maxPrompts = 6;

  if (prompts.length < minPrompts) {
    const fallbacks = ["Check availability this week", "What services do you offer?", "How do I book an appointment?"];
    fallbacks.forEach((fallback) => {
      if (!prompts.includes(fallback) && prompts.length < minPrompts) {
        prompts.push(fallback);
      }
    });
  }

  return prompts.slice(0, maxPrompts);
}

function BookingPage() {
  const { businessId } = Route.useParams();
  const [business, setBusiness] = useState<BackendBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "calendar">("chat");

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ success: boolean; business: BackendBusiness }>(`/book/${businessId}`)
      .then((res) => {
        if (res.success && res.business) {
          setBusiness(res.business);
        } else {
          setError("Business not found.");
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load business.");
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Refresh className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
        <DangerCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error || "This booking link is invalid or expired."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CalendarIcon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">{business.name}</div>
              <div className="text-[11px] text-muted-foreground">{business.headerTagline || "Book an appointment"}</div>
            </div>
          </Link>

          <div className="inline-flex items-center rounded-full border border-border bg-muted p-0.5 text-xs">
            <ViewToggle
              active={view === "chat"}
              onClick={() => setView("chat")}
              icon={<ChatRound className="h-3.5 w-3.5" />}
            >
              AI Chat
            </ViewToggle>
            <ViewToggle
              active={view === "calendar"}
              onClick={() => setView("calendar")}
              icon={<CalendarIcon className="h-3.5 w-3.5" />}
            >
              Calendar
            </ViewToggle>
          </div>
        </div>
      </header>

      {/* Tab guidance - shown below header */}
      <div className="mx-auto max-w-3xl px-6 py-3">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">
            {view === "chat" ? (
              <>
                <span className="font-medium text-foreground">AI Chat:</span> Describe what you need in plain language — I'll find the right time and service for you.
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">Calendar:</span> Browse available times and pick your preferred slot directly.
              </>
            )}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {view === "chat" ? (
          <ChatView business={business} businessId={businessId} />
        ) : (
          <CalendarView business={business} businessId={businessId} />
        )}

        <footer className="mt-10 text-center text-[11px] tracking-wide text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">CHROFA</span>
        </footer>
      </main>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
        active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function ChatView({ business, businessId }: { business: BackendBusiness; businessId: string }) {
  const suggestedPrompts = useMemo(() => generateSuggestedPrompts(business), [business]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    history.push({ role: "user", content: text });

    try {
      const res = await apiFetch<{ success: boolean; response: AIResponse }>(
        `/book/${businessId}/chat`,
        {
          method: "POST",
          body: JSON.stringify({ messages: history, extracted: {} }),
        },
      );
      const reply =
        res.response?.message || "I'm sorry, I didn't understand that. Could you rephrase?";
      const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", text: reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallback: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Our booking assistant is temporarily unavailable. Please call us directly to make an appointment.",
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const empty = messages.length === 0;

  if (empty) {
    return (
      <div className="chrofa-enter relative flex min-h-[calc(100vh-11rem)] flex-col items-center">
        <div className="relative flex w-full justify-center pt-6 pb-2">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-[42%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(120,161,187,0.55), rgba(120,161,187,0.18) 55%, rgba(120,161,187,0) 78%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-[45%] rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(120,161,187,0.45), rgba(120,161,187,0) 70%)",
            }}
          />
          <div
            aria-hidden
            className="relative h-44 w-44 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, rgba(235,245,238,0.85), rgba(120,161,187,0.55) 45%, rgba(40,48,68,0.35) 90%)",
              boxShadow:
                "inset -30px -40px 60px rgba(40,48,68,0.35), inset 20px 25px 40px rgba(235,245,238,0.35), 0 30px 60px -20px rgba(120,161,187,0.35)",
            }}
          />
        </div>

        <div className="relative mt-6 max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {greeting()} —
            <br className="sm:hidden" />
            <span className="sm:ml-2">welcome to {business.name}</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Tell me what you'd like to book and I'll take care of the rest.
          </p>
        </div>

        <div className="relative mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {(() => {
            const { services } = business;
            const cards = [];

            // Service-specific card
            if (services.length > 0) {
              const topService = services[0];
              cards.push({
                title: "Book",
                sub: `Book ${topService.name}`,
                tint: "bg-secondary",
                prompt: `Book ${topService.name}`,
              });
            } else {
              cards.push({
                title: "Book",
                sub: "Book an appointment",
                tint: "bg-secondary",
                prompt: "Book an appointment",
              });
            }

            // Availability card
            cards.push({
              title: "Availability",
              sub: "Check this week",
              tint: "bg-muted/25",
              prompt: "Check availability this week",
            });

            // Services card
            cards.push({
              title: "Services",
              sub: "See what we offer",
              tint: "bg-accent/20",
              prompt: "What services do you offer?",
            });

            return cards.map((card) => (
              <button
                key={card.prompt}
                onClick={() => send(card.prompt)}
                disabled={thinking}
                className="group relative overflow-hidden rounded-2xl border border-border bg-background p-4 text-left shadow-[0_1px_0_rgba(40,48,68,0.03),0_10px_24px_-18px_rgba(40,48,68,0.25)] transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_1px_0_rgba(40,48,68,0.03),0_16px_30px_-18px_rgba(40,48,68,0.35)] disabled:opacity-50"
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-foreground/80",
                    card.tint,
                  )}
                >
                  {card.title}
                </span>
                <div className="mt-3 text-sm text-foreground/80">{card.sub}</div>
              </button>
            ));
          })()}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative mt-6 w-full max-w-2xl rounded-2xl border border-border bg-background p-3 shadow-[0_1px_0_rgba(40,48,68,0.03),0_18px_40px_-24px_rgba(40,48,68,0.30)]"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything…"
            disabled={thinking}
            autoComplete="off"
            className="h-11 w-full rounded-xl border-transparent bg-transparent px-2 text-[15px] shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Attach file
            </button>
            <Button
              type="submit"
              disabled={thinking || !input.trim()}
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {thinking ? (
                <Refresh className="h-4 w-4 animate-spin" />
              ) : (
                <Plain className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="chrofa-enter flex flex-col">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {greeting()} — welcome to {business.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell me what you'd like to book and I'll take care of the rest.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <div
          ref={scrollRef}
          className="flex flex-col gap-5 overflow-y-auto px-5 py-6"
          style={{ minHeight: "22rem", maxHeight: "28rem" }}
        >
          {messages.map((msg) =>
            msg.role === "assistant" ? (
              <AssistantBubble key={msg.id} msg={msg} />
            ) : (
              <UserBubble key={msg.id} text={msg.text} />
            ),
          )}
          {thinking && <TypingIndicator />}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border px-3 py-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the booking assistant…"
            disabled={thinking}
            autoComplete="off"
            className="h-11 flex-1 rounded-xl border-transparent bg-muted/60 text-sm shadow-none focus-visible:border-accent focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={thinking || !input.trim()}
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {thinking ? (
              <Refresh className="h-4 w-4 animate-spin" />
            ) : (
              <Plain className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Suggested
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={thinking}
              className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowPathC({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 153.3 137.3 A 65 65 0 1 1 153.3 62.7" />
        <path d="M 120 70 C 145 85 95 115 120 130" />
      </g>
    </svg>
  );
}

function AssistantAvatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
      <FlowPathC className="h-5 w-5" />
    </div>
  );
}

function AssistantBubble({ msg }: { msg: ChatMsg }) {
  return (
    <div className="chrofa-enter flex items-start gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-relaxed text-foreground">{msg.text}</div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="chrofa-enter flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="flex h-8 items-center gap-1 rounded-full bg-muted px-3">
        <span
          className="chrofa-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="chrofa-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="chrofa-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}

const STEPS = ["Service", "Date & Time", "Your Details", "Confirm"] as const;

const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

function CalendarView({ business, businessId }: { business: BackendBusiness; businessId: string }) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );

  // Derive today's ISO date string for past-time filtering
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Filter TIME_SLOTS to hide past hours when the selected date is today
  const availableTimeSlots = useMemo(() => {
    if (date !== todayIso) return TIME_SLOTS;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return TIME_SLOTS.filter((slot) => {
      const [h, m] = slot.split(":").map(Number);
      return h * 60 + m > currentMinutes;
    });
  }, [date, todayIso]);

  const canNext =
    (step === 0 && !!service) ||
    (step === 1 && !!date && !!time) ||
    (step === 2 && name.trim() && /\S+@\S+/.test(email));

  const handleConfirm = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);
    try {
      await apiFetch(`/book/${businessId}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          service: service.name,
          date,
          time,
        }),
      });
      setConfirmed(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="chrofa-enter rounded-2xl border border-border bg-background p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
          <CheckCircle className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">You're booked</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A confirmation is on its way to {email}.
        </p>
        <dl className="mx-auto mt-6 max-w-sm divide-y divide-border rounded-xl border border-border bg-secondary/40 text-sm">
          <Row label="Service" value={service?.name ?? ""} />
          <Row label="Date" value={date ?? ""} />
          <Row label="Time" value={time ? formatTime(time) : ""} />
          <Row label="Name" value={name} />
        </dl>
      </div>
    );
  }

  return (
    <div className="chrofa-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          Welcome to {business.name} — let's get you booked
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Four short steps and you're done.</p>
      </div>

      <Stepper step={step} />

      <div className="mt-6 rounded-2xl border border-border bg-background p-6">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Choose a service</h2>
            <div className="space-y-3">
              {business.services.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  currency={business.currency}
                  selected={service?.id === s.id}
                  onSelect={() => setService(s)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold">Pick a date</h2>
              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {dates.map((d) => {
                  const iso = d.toISOString().slice(0, 10);
                  const selected = date === iso;
                  return (
                    <button
                      key={iso}
                      onClick={() => { setDate(iso); setTime(null); }}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 text-xs transition-colors",
                        selected
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border hover:border-accent",
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-semibold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold">Pick a time</h2>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {availableTimeSlots.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No more available times today. Please select a future date.
                  </p>
                ) : (
                  availableTimeSlots.map((t) => {
                    const selected = time === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-sm transition-colors",
                          selected
                            ? "border-accent bg-accent/10 font-medium text-foreground"
                            : "border-border text-foreground/80 hover:border-accent",
                        )}
                      >
                        {formatTime(t)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Your details</h2>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Full name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Review and confirm</h2>
            <dl className="divide-y divide-border rounded-xl border border-border text-sm">
              <Row label="Service" value={service?.name ?? ""} />
              <Row label="Duration" value={service ? `${service.durationMinutes} min` : ""} />
              <Row label="Date" value={date ?? ""} />
              <Row label="Time" value={time ? formatTime(time) : ""} />
              <Row label="Name" value={name} />
              <Row label="Email" value={email} />
            </dl>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue <AltArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <Refresh className="mr-1 h-4 w-4 animate-spin" /> : null}
              Confirm booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-1 py-1 transition-colors",
                state === "todo" && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "active" && "bg-accent text-white",
                  state === "todo" && "border border-border bg-background text-muted-foreground",
                )}
              >
                {state === "done" ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  state === "active" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  i < step ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ServiceCard({
  service,
  currency,
  selected,
  onSelect,
}: {
  service: Service;
  currency?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-accent bg-accent/5"
          : "border-border bg-background hover:border-accent/60",
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors",
          selected ? "bg-accent/15 text-primary" : "bg-secondary text-primary",
        )}
      >
        <CalendarIcon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-sm font-semibold text-foreground">{service.name}</h3>
          {service.price != null && (
            <span className="shrink-0 text-sm font-medium text-foreground">
              {formatPrice(service.price, currency)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {service.durationMinutes} min
        </p>
      </div>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors",
          selected ? "border-accent bg-accent text-white" : "border-border bg-background",
        )}
      >
        {selected && <CheckCircle className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}
