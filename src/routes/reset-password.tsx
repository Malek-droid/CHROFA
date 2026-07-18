import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Refresh, ArrowLeft, CheckCircle } from "@solar-icons/react";

function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" });
  const token = search.token as string | undefined;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Invalid or missing reset token. Please request a new password reset.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success("Password reset successful", {
        description: "You can now sign in with your new password.",
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to reset password. The link may have expired.");
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
              <CheckCircle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Password reset
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Invalid reset link
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/forgot-password" })}
              className="w-full h-11 rounded-xl"
            >
              Request new reset link
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
              Reset password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                New password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl border-border bg-background focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined,
  }),
  head: () => ({ meta: [{ title: "Reset password — CHROFA" }] }),
  component: ResetPasswordPage,
});
