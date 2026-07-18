import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single service as returned by GET /api/business/me (Mongoose subdoc). */
export type BusinessService = {
  _id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
};

/** A single staff member as returned by GET /api/business/me. */
export type BusinessStaff = {
  _id: string;
  name: string;
};

/** Subset of Business fields needed by dashboard consumers. */
export type Business = {
  _id: string;
  name: string;
  industry: string;
  timezone: string;
  slug?: string | null;
  headerTagline?: string | null;
  services: BusinessService[];
  staff: BusinessStaff[];
  googleCalendarConnected?: boolean;
  googleCalendarConnectedEmail?: string | null;
  notificationPreferences?: {
    emailConfirmation: boolean;
    smsReminders: boolean;
    noShowAlerts: boolean;
    dailyDigest: boolean;
  };
};

type BusinessContextType = {
  business: Business | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; business: Business }>(
        "/business/me"
      );
      if (res.success && res.business) {
        setBusiness(res.business);
      }
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load business data.";
      setError(msg);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch once when the provider mounts (inside the authenticated dashboard layout).
  // A fresh mount happens whenever the user logs in/out because dashboard.tsx
  // unmounts and remounts AppointmentProvider + BusinessProvider on each session,
  // so stale cached data from a previous session is never an issue.
  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return (
    <BusinessContext.Provider value={{ business, isLoading, error, refetch: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
