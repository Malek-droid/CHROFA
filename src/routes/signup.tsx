import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Cadence" }] }),
  component: () => <AuthCard mode="signup" />,
});
