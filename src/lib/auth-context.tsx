import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiFetch } from "./api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiFetch<{ success: boolean; user: AuthUser }>("/auth/me");
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      // Don't set user to null on rate limit errors - this prevents infinite loops
      if (err.code !== 'AUTH_RATE_LIMIT_EXCEEDED' && err.code !== 'RATE_LIMIT_EXCEEDED') {
        setUser(null);
      }
    }
  };

  // Check if user is already authenticated on mount
  useEffect(() => {
    if (!hasCheckedAuth) {
      fetchCurrentUser().finally(() => {
        setLoading(false);
        setHasCheckedAuth(true);
      });
    }
  }, [hasCheckedAuth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiFetch<{ success: boolean; user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiFetch<{ success: boolean; user: AuthUser }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Failed to clear cookie on server:", error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  /**
   * Re-fetches /api/auth/me and updates the in-memory user state.
   * Called by the onboarding screen after a successful business creation
   * so businessId is no longer null without requiring a full page reload.
   */
  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
