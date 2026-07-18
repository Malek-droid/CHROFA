import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Refresh, ArrowLeft } from "@solar-icons/react";

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
      toast.success("Reset link sent", {
        description: "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              We've sent a password reset link to {email}. The link will expire in 1 hour.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/login" })}
              className="w-full h-11 rounded-xl"
            >
              Return to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/login" })}
          className="mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>

        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
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
                className="h-11 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Refresh className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — CHROFA" }] }),
  component: ForgotPasswordPage,
});
