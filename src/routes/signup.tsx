import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return null;

  return <AuthCard mode="signup" />;
}

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — CHROFA" }] }),
  component: SignupPage,
});
