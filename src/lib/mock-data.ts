// ─── Canonical Appointment type (mirrors backend API response) ────────────────
// `customer`        — flattened customer name (for display, matches old field)
// `durationMinutes` — server-derived from service definition at booking time
// `staffName`       — replaces old `staff` field
export type Appointment = {
  id: string;
  // Customer info (flattened from populated customerId)
  customer: string;       // customer name — kept for backward compat with all consumers
  customerEmail: string | null;
  customerPhone: string | null;
  customerId: string | null;
  // Booking details
  service: string;
  serviceId: string;      // service ID for availability checking
  durationMinutes: number;
  date: string;           // ISO-8601
  status: "confirmed" | "pending" | "cancelled";
  staffName: string | null;
  notes: string | null;
  riskScore: number | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Local fallback lists (used by the new-appointment modal) ─────────────────
// These are static defaults shown when the business has no services/staff yet.
// The modal will prefer live data fetched from the business profile.
export const SERVICES = [
  { id: "haircut", name: "Haircut", duration: 30 },
  { id: "color",   name: "Color treatment", duration: 90 },
  { id: "consult", name: "Consultation",    duration: 45 },
  { id: "massage", name: "Massage",         duration: 60 },
];

export const STAFF = ["Alex Park", "Mia Chen", "Jordan Reyes"];

