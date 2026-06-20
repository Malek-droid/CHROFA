import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "./dashboard.settings";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Cadence" }] }),
  component: SettingsPage,
});
