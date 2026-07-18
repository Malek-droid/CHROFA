import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";
import { type Appointment } from "./mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape the consumer passes when creating a new appointment. */
export type NewAppointmentInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  service: string;         // must match a name in Business.services[]
  date: string;            // ISO-8601 timestamp
  staffName?: string;
  notes?: string;
};

/** Shape the consumer passes when updating an existing appointment. */
export type UpdateAppointmentInput = {
  status?: "pending" | "confirmed" | "cancelled";
  staffName?: string | null;
  notes?: string | null;
  date?: string;
};

type AppointmentContextType = {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  addAppointment: (input: NewAppointmentInput) => Promise<Appointment>;
  updateAppointment: (id: string, input: UpdateAppointmentInput) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<Appointment>;
  refetch: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all appointments for the business ──────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; appointments: Appointment[] }>(
        "/appointments"
      );
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load appointments.";
      setError(msg);
      // Keep the previous list intact so the UI doesn't go blank on a transient error.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount (runs once after the user is authenticated and the dashboard
  // layout wraps children in this provider).
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Create ───────────────────────────────────────────────────────────────
  const addAppointment = useCallback(async (input: NewAppointmentInput): Promise<Appointment> => {
    const res = await apiFetch<{ success: boolean; appointment: Appointment }>(
      "/appointments",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    const created = res.appointment;
    // Optimistically prepend to local state; most-recent-first matches backend sort.
    setAppointments((prev) => [created, ...prev]);
    return created;
  }, []);

  // ── Update ───────────────────────────────────────────────────────────────
  const updateAppointment = useCallback(
    async (id: string, input: UpdateAppointmentInput): Promise<Appointment> => {
      const res = await apiFetch<{ success: boolean; appointment: Appointment }>(
        `/appointments/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(input),
        }
      );
      const updated = res.appointment;
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );
      return updated;
    },
    []
  );

  // ── Cancel (soft-delete) ─────────────────────────────────────────────────
  const cancelAppointment = useCallback(async (id: string): Promise<Appointment> => {
    const res = await apiFetch<{ success: boolean; appointment: Appointment }>(
      `/appointments/${id}`,
      { method: "DELETE" }
    );
    const cancelled = res.appointment;
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? cancelled : a))
    );
    return cancelled;
  }, []);

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        loading,
        error,
        addAppointment,
        updateAppointment,
        cancelAppointment,
        refetch: fetchAppointments,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error("useAppointments must be used within an AppointmentProvider");
  }
  return context;
}
