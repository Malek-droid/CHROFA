import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "./dashboard.calendar";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Cadence" }] }),
  component: CalendarPage,
});
