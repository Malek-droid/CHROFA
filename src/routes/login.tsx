import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Cadence" }] }),
  component: () => <AuthCard mode="login" />,
});
