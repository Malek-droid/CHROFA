import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useRef } from "react";
import {
  Refresh,
  AddCircle,
  TrashBin2,
  CalendarMark,
  AltArrowRight,
  AltArrowLeft,
  CheckCircle,
} from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { CURRENCIES, getCurrencySymbol } from "@/lib/currency";
import { TIMEZONES } from "@/lib/timezones";

// ─── Types ────────────────────────────────────────────────────────────────────

type Industry =
  | "dentists"
  | "medical_clinics"
  | "mental_health_therapists"
  | "hair_salons"
  | "nail_salons"
  | "spas"
  | "personal_trainers"
  | "nutritionists"
  | "physiotherapists"
  | "chiropractors"
  | "lawyers"
  | "architects"
  | "interior_designers"
  | "veterinary_clinics";

interface IndustryConfig {
  id: Industry;
  label: string;
  tier: number;
}

interface ServiceEntry {
  id: string;
  name: string;
  durationMinutes: string;
  price: string;
}

interface StaffEntry {
  id: string;
  name: string;
}

interface DayHours {
  day: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

// ─── Preset data ──────────────────────────────────────────────────────────────

const INDUSTRIES_CONFIG: IndustryConfig[] = [
  // Tier 1
  { id: "dentists", label: "Dentists", tier: 1 },
  { id: "medical_clinics", label: "Medical Clinics", tier: 1 },
  { id: "mental_health_therapists", label: "Mental Health Therapists", tier: 1 },
  { id: "hair_salons", label: "Hair Salons", tier: 1 },
  { id: "nail_salons", label: "Nail Salons", tier: 1 },
  { id: "spas", label: "Spas", tier: 1 },
  
  // Tier 2
  { id: "personal_trainers", label: "Personal Trainers", tier: 2 },
  { id: "nutritionists", label: "Nutritionists", tier: 2 },
  { id: "physiotherapists", label: "Physiotherapists", tier: 2 },
  { id: "chiropractors", label: "Chiropractors", tier: 2 },
  
  // Tier 3
  { id: "lawyers", label: "Lawyers", tier: 3 },
  { id: "architects", label: "Architects", tier: 3 },
  { id: "interior_designers", label: "Interior Designers", tier: 3 },
  
  // Tier 4
  { id: "veterinary_clinics", label: "Veterinary Clinics", tier: 4 },
];

const INDUSTRY_LABELS: Record<Industry, string> = Object.fromEntries(
  INDUSTRIES_CONFIG.map((i) => [i.id, i.label])
) as Record<Industry, string>;

const INDUSTRY_PRESETS: Record<Industry, Omit<ServiceEntry, "id">[]> = {
  // Tier 1
  dentists: [
    { name: "Routine Cleaning", durationMinutes: "30", price: "" },
    { name: "Initial Consultation", durationMinutes: "45", price: "" },
    { name: "Filling", durationMinutes: "45", price: "" },
    { name: "Root Canal", durationMinutes: "90", price: "" },
    { name: "Teeth Whitening", durationMinutes: "60", price: "" },
  ],
  medical_clinics: [
    { name: "Initial Consultation", durationMinutes: "30", price: "" },
    { name: "Follow-up Visit", durationMinutes: "15", price: "" },
    { name: "Annual Checkup", durationMinutes: "45", price: "" },
    { name: "Blood Work", durationMinutes: "15", price: "" },
    { name: "Vaccination", durationMinutes: "15", price: "" },
  ],
  mental_health_therapists: [
    { name: "Initial Consultation", durationMinutes: "60", price: "" },
    { name: "Individual Therapy Session", durationMinutes: "50", price: "" },
    { name: "Couples Therapy", durationMinutes: "75", price: "" },
    { name: "Family Therapy", durationMinutes: "90", price: "" },
  ],
  hair_salons: [
    { name: "Haircut", durationMinutes: "30", price: "" },
    { name: "Color Treatment", durationMinutes: "90", price: "" },
    { name: "Blowout", durationMinutes: "30", price: "" },
    { name: "Kids Haircut", durationMinutes: "20", price: "" },
    { name: "Deep Conditioning", durationMinutes: "30", price: "" },
  ],
  nail_salons: [
    { name: "Manicure", durationMinutes: "30", price: "" },
    { name: "Pedicure", durationMinutes: "45", price: "" },
    { name: "Gel Manicure", durationMinutes: "45", price: "" },
    { name: "Acrylic Full Set", durationMinutes: "90", price: "" },
    { name: "Nail Art", durationMinutes: "30", price: "" },
  ],
  spas: [
    { name: "Swedish Massage", durationMinutes: "60", price: "" },
    { name: "Deep Tissue Massage", durationMinutes: "60", price: "" },
    { name: "Hot Stone Massage", durationMinutes: "75", price: "" },
    { name: "Facial", durationMinutes: "45", price: "" },
    { name: "Body Wrap", durationMinutes: "60", price: "" },
  ],
  
  // Tier 2
  personal_trainers: [
    { name: "Personal Training Session", durationMinutes: "60", price: "" },
    { name: "Small Group Training", durationMinutes: "45", price: "" },
    { name: "Fitness Assessment", durationMinutes: "30", price: "" },
    { name: "Nutrition Consultation", durationMinutes: "30", price: "" },
  ],
  nutritionists: [
    { name: "Initial Consultation", durationMinutes: "60", price: "" },
    { name: "Follow-up Session", durationMinutes: "30", price: "" },
    { name: "Meal Plan Review", durationMinutes: "45", price: "" },
    { name: "Grocery Store Tour", durationMinutes: "60", price: "" },
  ],
  physiotherapists: [
    { name: "Initial Assessment", durationMinutes: "45", price: "" },
    { name: "Treatment Session", durationMinutes: "30", price: "" },
    { name: "Rehabilitation Exercise", durationMinutes: "45", price: "" },
    { name: "Manual Therapy", durationMinutes: "30", price: "" },
  ],
  chiropractors: [
    { name: "Initial Consultation", durationMinutes: "45", price: "" },
    { name: "Adjustment", durationMinutes: "15", price: "" },
    { name: "Spinal Decompression", durationMinutes: "30", price: "" },
    { name: "Soft Tissue Therapy", durationMinutes: "30", price: "" },
  ],
  
  // Tier 3
  lawyers: [
    { name: "Initial Consultation", durationMinutes: "60", price: "" },
    { name: "Contract Review", durationMinutes: "45", price: "" },
    { name: "Document Drafting", durationMinutes: "60", price: "" },
    { name: "Court Appearance", durationMinutes: "120", price: "" },
  ],
  architects: [
    { name: "Initial Consultation", durationMinutes: "60", price: "" },
    { name: "Site Visit", durationMinutes: "90", price: "" },
    { name: "Design Review", durationMinutes: "60", price: "" },
    { name: "Project Planning", durationMinutes: "90", price: "" },
  ],
  interior_designers: [
    { name: "Initial Consultation", durationMinutes: "60", price: "" },
    { name: "Design Presentation", durationMinutes: "90", price: "" },
    { name: "Space Planning", durationMinutes: "60", price: "" },
    { name: "Material Selection", durationMinutes: "45", price: "" },
  ],
  
  // Tier 4
  veterinary_clinics: [
    { name: "Wellness Exam", durationMinutes: "30", price: "" },
    { name: "Vaccination", durationMinutes: "15", price: "" },
    { name: "Dental Cleaning", durationMinutes: "45", price: "" },
    { name: "Surgery Consultation", durationMinutes: "30", price: "" },
    { name: "Grooming", durationMinutes: "60", price: "" },
  ],
};

const DEFAULT_HOURS: DayHours[] = [
  { day: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" },
  { day: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: 5, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: 6, isOpen: true, openTime: "09:00", closeTime: "18:00" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function uid() {
  return Math.random().toString(36).slice(2);
}

function makePresets(industry: Industry): ServiceEntry[] {
  return INDUSTRY_PRESETS[industry].map((p) => ({ ...p, id: uid() }));
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
              i < current
                ? "bg-primary text-primary-foreground"
                : i === current
                  ? "border-2 border-primary bg-primary/15 text-primary"
                  : "border border-border bg-transparent text-muted-foreground",
            ].join(" ")}
          >
            {i < current ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={[
                "h-px w-8 transition-all duration-300",
                i < current ? "bg-primary" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Business info ────────────────────────────────────────────────────

interface Step1Props {
  businessName: string;
  setBusinessName: (v: string) => void;
  industry: Industry | "";
  setIndustry: (v: Industry) => void;
  currency: string;
  setCurrency: (v: string) => void;
  errors: Record<string, string>;
}

function Step1({ businessName, setBusinessName, industry, setIndustry, currency, setCurrency, errors }: Step1Props) {
  const tiers = [1, 2, 3, 4];
  const tierLabels: Record<number, string> = {
    1: "Most Popular",
    2: "Health & Wellness",
    3: "Professional Services",
    4: "Other",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tell us about your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This name and category will shape how your scheduling is set up.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business-name">Business name</Label>
        <Input
          id="business-name"
          placeholder="e.g. Smith & Associates"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className={errors.businessName ? "border-destructive" : ""}
        />
        {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
          <SelectTrigger id="industry" className={errors.industry ? "border-destructive" : ""}>
            <SelectValue placeholder="Select your industry…" />
          </SelectTrigger>
          <SelectContent>
            {tiers.map((tier) => (
              <div key={tier}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {tierLabels[tier]}
                </div>
                {INDUSTRIES_CONFIG.filter((i) => i.tier === tier).map((ind) => (
                  <SelectItem key={ind.id} value={ind.id}>
                    {ind.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        {errors.industry && <p className="text-xs text-destructive">{errors.industry}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency">
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
    </div>
  );
}

// ─── Step 2: Services ─────────────────────────────────────────────────────────

interface Step2Props {
  industry: Industry;
  services: ServiceEntry[];
  setServices: (v: ServiceEntry[]) => void;
  currency: string;
  errors: Record<string, string>;
}

function Step2({ industry, services, setServices, currency, errors }: Step2Props) {
  const hasPresets = INDUSTRY_PRESETS[industry]?.length > 0;

  const addService = () => {
    setServices([...services, { id: uid(), name: "", durationMinutes: "", price: "" }]);
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof Omit<ServiceEntry, "id">, value: string) => {
    setServices(services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Your services</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasPresets
            ? "We've suggested common services for your industry. Edit, remove, or add your own."
            : "Add the services you offer. You can always update these later in settings."}
        </p>
      </div>

      <div className="space-y-3">
        {services.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center">
            <p className="text-sm text-muted-foreground">No services yet. Add one below.</p>
          </div>
        )}

        {services.map((svc, idx) => (
          <div
            key={svc.id}
            className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-border/80"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Service {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeService(svc.id)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove service"
              >
                <TrashBin2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor={`svc-name-${svc.id}`} className="text-xs">
                  Name
                </Label>
                <Input
                  id={`svc-name-${svc.id}`}
                  placeholder="e.g. Haircut"
                  value={svc.name}
                  onChange={(e) => updateService(svc.id, "name", e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`svc-dur-${svc.id}`} className="text-xs">
                  Duration (min)
                </Label>
                <Input
                  id={`svc-dur-${svc.id}`}
                  type="number"
                  min="1"
                  placeholder="30"
                  value={svc.durationMinutes}
                  onChange={(e) => updateService(svc.id, "durationMinutes", e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`svc-price-${svc.id}`} className="text-xs">
                  Price ({getCurrencySymbol(currency)}) (optional)
                </Label>
                <Input
                  id={`svc-price-${svc.id}`}
                  type="number"
                  min="0"
                  placeholder="Leave blank"
                  value={svc.price}
                  onChange={(e) => updateService(svc.id, "price", e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}

      <Button type="button" variant="outline" size="sm" onClick={addService} className="gap-1.5">
        <AddCircle className="h-4 w-4" />
        Add service
      </Button>
    </div>
  );
}

// ─── Step 3: Staff ────────────────────────────────────────────────────────────

interface Step3Props {
  staff: StaffEntry[];
  setStaff: (v: StaffEntry[]) => void;
  errors: Record<string, string>;
}

function Step3({ staff, setStaff, errors }: Step3Props) {
  const addStaff = () => {
    setStaff([...staff, { id: uid(), name: "" }]);
  };

  const removeStaff = (id: string) => {
    setStaff(staff.filter((m) => m.id !== id));
  };

  const updateStaff = (id: string, value: string) => {
    setStaff(staff.map((m) => (m.id === id ? { ...m, name: value } : m)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Your team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the names of your staff members. Customers will be able to book with them by name. At
          least one is required.
        </p>
      </div>

      <div className="space-y-2">
        {staff.map((member, idx) => (
          <div key={member.id} className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
              {idx + 1}
            </div>
            <Input
              id={`staff-${member.id}`}
              placeholder="Full name"
              value={member.name}
              onChange={(e) => updateStaff(member.id, e.target.value)}
              className="h-9"
            />
            {staff.length > 1 && (
              <button
                type="button"
                onClick={() => removeStaff(member.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove staff member"
              >
                <TrashBin2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {errors.staff && <p className="text-xs text-destructive">{errors.staff}</p>}

      <Button type="button" variant="outline" size="sm" onClick={addStaff} className="gap-1.5">
        <AddCircle className="h-4 w-4" />
        Add staff member
      </Button>
    </div>
  );
}

// ─── Step 4: Hours & timezone ─────────────────────────────────────────────────

interface Step4Props {
  hours: DayHours[];
  setHours: (v: DayHours[]) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  errors: Record<string, string>;
}

function Step4({ hours, setHours, timezone, setTimezone, errors }: Step4Props) {
  const updateHour = (day: number, field: keyof DayHours, value: string | boolean) => {
    setHours(hours.map((h) => (h.day === day ? { ...h, [field]: value } : h)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Business hours & timezone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set when you're open each day. You can update this any time in settings.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-card/50 p-4">
        {hours.map((h) => (
          <div key={h.day} className="flex items-center gap-3 py-1">
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
                  className="h-8 w-28 text-sm"
                  aria-label={`${DAY_NAMES[h.day]} opening time`}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={h.closeTime}
                  onChange={(e) => updateHour(h.day, "closeTime", e.target.value)}
                  className="h-8 w-28 text-sm"
                  aria-label={`${DAY_NAMES[h.day]} closing time`}
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={timezone} onValueChange={(v) => setTimezone(v)}>
          <SelectTrigger id="timezone" className={errors.timezone ? "border-destructive" : ""}>
            <SelectValue placeholder="Select timezone…" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {(() => {
              const options = [...TIMEZONES];
              if (timezone && !options.some((t) => t.value === timezone)) {
                options.unshift({ value: timezone, label: timezone });
              }
              return options.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label} ({tz.value})
                </SelectItem>
              ));
            })()}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select your local business timezone for appointments and scheduling.
        </p>
        {errors.timezone && <p className="text-xs text-destructive">{errors.timezone}</p>}
      </div>
    </div>
  );
}

// ─── Main onboarding page ─────────────────────────────────────────────────────

const STEP_LABELS = ["Business", "Services", "Team", "Hours"];
const TOTAL_STEPS = 4;

function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  // ── Step 1 state ───────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [currency, setCurrency] = useState("USD");

  // ── Step 2 state ───────────────────────────────────────────────────────────
  const [services, setServices] = useState<ServiceEntry[]>([]);
  // Track whether we've loaded presets for the current industry to avoid
  // overwriting edits when the component re-renders
  const [presetsLoadedFor, setPresetsLoadedFor] = useState<Industry | "">("");

  // ── Step 3 state ───────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffEntry[]>([{ id: uid(), name: "" }]);

  // ── Step 4 state ───────────────────────────────────────────────────────────
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch {
      return "America/New_York";
    }
  });

  // ── Draft state ────────────────────────────────────────────────────────────
  // Tracks the MongoDB _id of an in-progress draft business created in step 1.
  // Once set, subsequent steps PATCH this record instead of POSTing a new one.
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftLoadedRef = useRef(false);

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(0); // 0-indexed
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Tracks in-flight draft PATCH so the Next button can be disabled and
  // navigation is blocked until the save either succeeds or surfaces an error.
  const [savePending, setSavePending] = useState(false);

  // ── Guards ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    } else if (!loading && user && user.businessId) {
      // If the user already has a businessId we need to check if it's a draft
      // (isOnboarded === false) before redirecting them away.
      // The actual redirect for fully-onboarded users happens after the draft
      // load effect below.
    }
  }, [user, loading, navigate]);

  // ── Load existing draft on mount ───────────────────────────────────────────
  useEffect(() => {
    if (loading || !user || !user.businessId || draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    apiFetch<{ success: boolean; business: any }>("/business/me")
      .then((res) => {
        if (!res.success || !res.business) return;
        const biz = res.business;
        if (biz.isOnboarded) {
          // Already completed onboarding — redirect away
          navigate({ to: "/dashboard" });
          return;
        }
        // Pre-fill from saved draft and resume
        setDraftId(biz._id || biz.id);
        if (biz.name) setBusinessName(biz.name);
        if (biz.industry) setIndustry(biz.industry as Industry);
        if (biz.currency) setCurrency(biz.currency);
        if (Array.isArray(biz.services) && biz.services.length > 0) {
          setServices(
            biz.services.map((s: any) => ({
              id: uid(),
              name: s.name || "",
              durationMinutes: String(s.durationMinutes || ""),
              price: s.price != null ? String(s.price) : "",
            }))
          );
        }
        if (Array.isArray(biz.staff) && biz.staff.length > 0) {
          setStaff(biz.staff.map((m: any) => ({ id: uid(), name: m.name || "" })));
        }
        if (Array.isArray(biz.openingHours) && biz.openingHours.length > 0) {
          setHours(
            biz.openingHours.map((h: any) => ({
              day: h.day,
              isOpen: !!h.isOpen,
              openTime: h.openTime || "09:00",
              closeTime: h.closeTime || "18:00",
            }))
          );
        }
        if (biz.timezone) setTimezone(biz.timezone);
      })
      .catch(() => {
        // Silently ignore — user starts fresh
      });
  }, [loading, user, navigate]);

  // Load presets when industry changes (only once per industry selection)
  useEffect(() => {
    if (industry && industry !== presetsLoadedFor) {
      setServices(makePresets(industry as Industry));
      setPresetsLoadedFor(industry as Industry);
    }
  }, [industry, presetsLoadedFor]);

  if (loading || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Refresh className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Per-step validation ────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!businessName.trim()) newErrors.businessName = "Business name is required.";
      if (!industry) newErrors.industry = "Please select your industry.";
    }

    if (step === 1) {
      if (services.length === 0) {
        newErrors.services = "At least one service is required.";
      } else {
        for (const svc of services) {
          if (!svc.name.trim()) {
            newErrors.services = "All services must have a name.";
            break;
          }
          const dur = Number(svc.durationMinutes);
          if (!svc.durationMinutes || isNaN(dur) || dur < 1) {
            newErrors.services = `"${svc.name || "A service"}" needs a valid duration (minimum 1 minute).`;
            break;
          }
        }
      }
    }

    if (step === 2) {
      if (staff.length === 0) {
        newErrors.staff = "At least one staff member is required.";
      } else {
        for (const m of staff) {
          if (!m.name.trim()) {
            newErrors.staff = "All staff members must have a name.";
            break;
          }
        }
      }
    }

    if (step === 3) {
      if (!timezone.trim()) newErrors.timezone = "Timezone is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;

    // ── Draft auto-save ──────────────────────────────────────────────────────
    // Step 0: POST a new draft business (name + industry only)
    // Steps 1 & 2: PATCH the existing draft with services or staff
    setSavePending(true);
    try {
      if (step === 0 && !draftId) {
        const res = await apiFetch<{ success: boolean; business: { id?: string; _id?: string } }>(
          "/business",
          {
            method: "POST",
            body: JSON.stringify({
              name: businessName.trim(),
              industry,
              currency,
              draft: true,
            }),
          }
        );
        if (res.success && res.business) {
          setDraftId((res.business.id || res.business._id) ?? null);
        }
      } else if (step === 0 && draftId) {
        // Already have a draft — just PATCH the name/industry/currency
        await apiFetch("/business", {
          method: "PATCH",
          body: JSON.stringify({ name: businessName.trim(), industry, currency }),
        });
      } else if (step === 1 && draftId) {
        await apiFetch("/business", {
          method: "PATCH",
          body: JSON.stringify({
            services: services.map((s) => ({
              name: s.name.trim(),
              durationMinutes: Number(s.durationMinutes),
              price: s.price !== "" ? Number(s.price) : null,
            })),
          }),
        });
      } else if (step === 2 && draftId) {
        await apiFetch("/business", {
          method: "PATCH",
          body: JSON.stringify({
            staff: staff.map((m) => ({ name: m.name.trim() })),
          }),
        });
      }
    } catch (err: any) {
      // Draft save failed — surface a visible error and BLOCK navigation.
      // The user's in-progress form state is preserved so they can retry
      // without losing their data.
      const msg =
        err?.message ||
        "Couldn't save your progress. Check your connection and try again.";
      toast.error("Save failed", { description: msg });
      setSavePending(false);
      return; // ← CRITICAL: do not advance to the next step on failure
    }
    setSavePending(false);

    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (draftId) {
        // PATCH existing draft to finalize onboarding
        await apiFetch("/business", {
          method: "PATCH",
          body: JSON.stringify({
            openingHours: hours.map((h) => ({
              day: h.day,
              isOpen: h.isOpen,
              openTime: h.isOpen ? h.openTime : null,
              closeTime: h.isOpen ? h.closeTime : null,
            })),
            timezone: timezone.trim(),
            currency,
            isOnboarded: true,
          }),
        });
      } else {
        // No draft exists yet — create in one shot (fallback path)
        await apiFetch("/business", {
          method: "POST",
          body: JSON.stringify({
            name: businessName.trim(),
            industry,
            currency,
            services: services.map((s) => ({
              name: s.name.trim(),
              durationMinutes: Number(s.durationMinutes),
              price: s.price !== "" ? Number(s.price) : null,
            })),
            staff: staff.map((m) => ({ name: m.name.trim() })),
            openingHours: hours.map((h) => ({
              day: h.day,
              isOpen: h.isOpen,
              openTime: h.isOpen ? h.openTime : null,
              closeTime: h.isOpen ? h.closeTime : null,
            })),
            timezone: timezone.trim(),
          }),
        });
      }

      // Refresh auth context so businessId is no longer null in-memory
      await refreshUser();

      toast.success("Business created!", {
        description: `Welcome to Cadence, ${businessName.trim()}.`,
      });

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      const msg = err?.message || "Something went wrong. Please try again.";
      setSubmitError(msg);
      toast.error("Failed to save your business", { description: msg });
      // NOTE: We deliberately do NOT navigate away or reset steps —
      // all form state is preserved so the user can fix the issue and retry.
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 px-6 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
              <CalendarMark className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Cadence</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {TOTAL_STEPS} — {STEP_LABELS[step]}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          {/* Progress */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <StepIndicator current={step} total={TOTAL_STEPS} />
            <p className="text-xs text-muted-foreground">
              Set up your business to start accepting appointments
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              {step === 0 && (
                <Step1
                  businessName={businessName}
                  setBusinessName={setBusinessName}
                  industry={industry}
                  setIndustry={(v) => {
                    setIndustry(v);
                  }}
                  currency={currency}
                  setCurrency={setCurrency}
                  errors={errors}
                />
              )}
              {step === 1 && (
                <Step2
                  industry={industry as Industry}
                  services={services}
                  setServices={setServices}
                  currency={currency}
                  errors={errors}
                />
              )}
              {step === 2 && <Step3 staff={staff} setStaff={setStaff} errors={errors} />}
              {step === 3 && (
                <Step4
                  hours={hours}
                  setHours={setHours}
                  timezone={timezone}
                  setTimezone={setTimezone}
                  errors={errors}
                />
              )}
            </div>

            {/* Submit error (shown on step 4 only) */}
            {submitError && step === 3 && (
              <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={step === 0 || submitting}
                className="gap-1.5"
              >
                <AltArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {step < TOTAL_STEPS - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting || savePending}
                  className="gap-1.5"
                >
                  {savePending ? (
                    <>
                      <Refresh className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Next
                      <AltArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-1.5 min-w-32"
                >
                  {submitting ? (
                    <>
                      <Refresh className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Launch my business
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Cadence" }] }),
  component: OnboardingPage,
});
