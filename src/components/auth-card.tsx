import { Link, useNavigate } from "@tanstack/react-router";
import { Refresh } from "@solar-icons/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { LoadingCompleteSVG } from "@/components/ui/loading";
import { API_BASE } from "@/lib/api";

type Props = {
  mode: "login" | "signup";
};

export function AuthCard({ mode }: Props) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLogin && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "google_auth_failed") {
        setErrorMsg("Google authentication failed. Please try again.");
      }
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    if (!email.trim() || !password) {
      const msg = "Please fill in all fields.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!isLogin && !name.trim()) {
      const msg = "Please provide your full name.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        setSuccess(true);
        toast.success("Welcome back!", {
          description: "Successfully signed in to your dashboard.",
        });
      } else {
        await register(name, email, password);
        setSuccess(true);
        toast.success("Account created successfully!", {
          description: "Welcome to CHROFA. Let's set up your business.",
        });
      }
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 2200);
    } catch (err: any) {
      console.error(err);
      if (err.details && Array.isArray(err.details)) {
        const errors: Record<string, string> = {};
        err.details.forEach((detail: { field: string; message: string }) => {
          errors[detail.field] = detail.message;
        });
        setFieldErrors(errors);
        setErrorMsg("Please fix the errors below.");
        const first = err.details[0];
        toast.error(first.message || "Please fix the errors below.");
      } else if (err.code === "DUPLICATE_KEY" || err.status === 409) {
        const msg = err.message || "An account with this email already exists.";
        setFieldErrors({ email: msg });
        setErrorMsg(msg);
        toast.error(msg);
      } else {
        const msg = err.message || "An authentication error occurred.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <LoadingCompleteSVG
          message={isLogin ? "Welcome back! Redirecting..." : "Account created! Redirecting..."}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh w-full grid lg:grid-cols-2 bg-background overflow-hidden">
      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-4 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm sm:max-w-md" style={{ zoom: 0.85 }}>
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm sm:text-[15px] text-muted-foreground">
              {isLogin
                ? "Sign in to continue to your dashboard."
                : "Start scheduling smarter in minutes."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Redirect to backend Google OAuth — the backend stores the referer
              // in a cookie so the callback can redirect back to the correct port
              const base = API_BASE.replace("/api", "");
              window.location.href = `${base}/api/auth/google`;
            }}
            className="w-full h-9 sm:h-10 rounded-xl border-border bg-background text-foreground font-medium hover:bg-muted transition-colors"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-10 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors"
                />
                {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors"
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors"
              />
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>

            {isLogin && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Refresh className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-foreground hover:text-accent transition-colors"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-foreground hover:text-accent transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12"
        style={{ backgroundColor: "var(--indigo)" }}
      >
        {/* Radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 70% 40%, rgba(120,161,187,0.32) 0%, rgba(120,161,187,0.10) 35%, rgba(40,48,68,0) 70%)",
          }}
        />
        {/* Fine dot texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(235,245,238,0.9) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Floating chat demo */}
        <div
          aria-hidden
          className="absolute z-10 hidden lg:flex flex-col gap-2"
          style={{
            top: "28%",
            left: "52%",
            maxWidth: "260px",
          }}
        >
          <div
            className="animate-chat-bubble-1 self-end rounded-2xl px-3.5 py-2 backdrop-blur-sm text-[13px] font-medium tracking-tight"
            style={{
              backgroundColor: "rgba(235,245,238,0.10)",
              boxShadow: "0 12px 40px rgba(120,161,187,0.12)",
              color: "rgba(235,245,238,0.78)",
            }}
          >
            Can I get a haircut Tuesday morning?
          </div>
          <div
            className="animate-chat-bubble-2 self-start rounded-2xl px-3.5 py-2 backdrop-blur-sm text-[13px] font-medium tracking-tight"
            style={{
              backgroundColor: "#283044",
              boxShadow: "0 0 24px rgba(120,161,187,0.15)",
              color: "rgba(235,245,238,0.85)",
            }}
          >
            Tuesday 9:30am or 10:15am — which works?
          </div>
          <div
            className="animate-chat-bubble-3 self-end rounded-2xl px-3.5 py-2 backdrop-blur-sm text-[13px] font-medium tracking-tight"
            style={{
              backgroundColor: "rgba(235,245,238,0.10)",
              boxShadow: "0 12px 40px rgba(120,161,187,0.12)",
              color: "rgba(235,245,238,0.78)",
            }}
          >
            10:15 please.
          </div>
          <div
            className="animate-chat-bubble-4 self-start rounded-2xl px-3.5 py-2 backdrop-blur-sm text-[13px] font-medium tracking-tight"
            style={{
              backgroundColor: "rgba(235,245,238,0.09)",
              boxShadow: "0 16px 48px rgba(120,161,187,0.12)",
              color: "rgba(235,245,238,0.72)",
            }}
          >
            <span className="mr-1.5">✓</span> Tuesday · 10:15 AM · Confirmed
          </div>
        </div>

        {/* Logo slot */}
        <div className="relative z-10">
          <div
            aria-label="Logo placeholder"
            className="h-10 w-32 rounded-md"
            style={{ backgroundColor: "transparent" }}
          />
        </div>

        {/* Calm line */}
        <div className="relative z-10 max-w-md">
          <p className="text-2xl leading-snug font-light" style={{ color: "var(--mint)" }}>
            Easy time.
          </p>
          <p
            className="mt-3 text-[15px] leading-relaxed"
            style={{ color: "rgba(235,245,238,0.65)" }}
          >
            Scheduling that stays out of your way — so every booking feels effortless.
          </p>
        </div>
      </div>
    </div>
  );
}
