import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SERVICES } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book an appointment — Cadence" }] }),
  component: BookPage,
});

type Msg = { id: string; role: "user" | "assistant"; text: string; ts: Date };

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

function BookPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m1", role: "assistant", text: "Hi! I can help you book an appointment. Tell me what you need and when works best.", ts: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>("10:00");
  const [service, setService] = useState<string>(SERVICES[0].id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    if (!text.trim()) return;
    const user: Msg = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    setMessages((m) => [...m, user]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      const reply: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: mockReply(text),
        ts: new Date(),
      };
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900);
  }

  function confirm() {
    if (!date) return toast.error("Pick a date first");
    const svc = SERVICES.find((s) => s.id === service)!;
    toast.success("Booking confirmed", {
      description: `${svc.name} on ${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${time}`,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
              <CalendarClock className="h-3.5 w-3.5" />
            </span>
            Cadence
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Chat panel */}
        <section className="flex h-[640px] flex-col rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Chat booking</h2>
            <p className="text-xs text-muted-foreground">Tell the assistant what you'd like to book.</p>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex animate-in fade-in slide-in-from-bottom-1", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                  <div className={cn("mt-1 text-[10px] opacity-60", m.role === "user" ? "text-primary-foreground" : "text-muted-foreground")}>
                    {m.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-lg bg-muted px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-border p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I want Tuesday morning for a haircut"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>

        {/* Manual booking */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Pick a slot</h2>
            <p className="text-xs text-muted-foreground">Prefer the classic way? Choose your time below.</p>
          </div>
          <div className="space-y-5 p-5">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.duration}m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
              <div className="rounded-md border border-border p-2">
                <Calendar mode="single" selected={date} onSelect={setDate} className="pointer-events-auto" />
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Time</Label>
              <div className="grid grid-cols-4 gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    type="button"
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs transition",
                      time === t
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={confirm} className="w-full">Confirm booking</Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function mockReply(input: string) {
  const i = input.toLowerCase();
  if (i.includes("tuesday")) return "Tuesday looks open. I can offer 9:30am, 10:15am, or 2:00pm. Which would you like?";
  if (i.includes("haircut")) return "Got it — a haircut is 30 minutes. What day works for you?";
  if (i.includes("color")) return "Color treatment runs about 90 minutes. Any preferred day this week?";
  if (i.includes("morning")) return "Morning slots available: 9:00, 9:30, 10:00, 10:30. Pick one and I'll lock it in.";
  if (i.includes("cancel")) return "Sure — share the booking reference or your email and I'll find it.";
  return "Thanks! Could you share the service and the day or time range you'd like?";
}
