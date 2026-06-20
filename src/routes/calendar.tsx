import { createFileRoute } from "@tanstack/react-router";
import CalendarComponent from "./dashboard.calendar";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Cadence" }] }),
  component: () => {
    const Comp = (CalendarComponent as unknown as { options: { component: React.FC } }).options.component;
    return <Comp />;
  },
});
