import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return null;

  return <AuthCard mode="login" />;
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — CHROFA" }] }),
  component: LoginPage,
});
