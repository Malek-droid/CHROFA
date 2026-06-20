export type Appointment = {
  id: string;
  customer: string;
  service: string;
  date: string; // ISO
  duration: number; // minutes
  status: "confirmed" | "pending" | "cancelled";
  staff?: string;
  notes?: string;
};

const today = new Date();
function d(offsetDays: number, h: number, m = 0) {
  const dt = new Date(today);
  dt.setDate(today.getDate() + offsetDays);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}

export const SERVICES = [
  { id: "haircut", name: "Haircut", duration: 30 },
  { id: "color", name: "Color treatment", duration: 90 },
  { id: "consult", name: "Consultation", duration: 45 },
  { id: "massage", name: "Massage", duration: 60 },
];

export const STAFF = ["Alex Park", "Mia Chen", "Jordan Reyes"];

export const APPOINTMENTS: Appointment[] = [
  { id: "a1", customer: "Sarah Lin", service: "Haircut", date: d(0, 9, 30), duration: 30, status: "confirmed", staff: "Alex Park" },
  { id: "a2", customer: "Marcus Rae", service: "Consultation", date: d(0, 11, 0), duration: 45, status: "confirmed", staff: "Mia Chen" },
  { id: "a3", customer: "Priya Shah", service: "Color treatment", date: d(0, 14, 0), duration: 90, status: "pending", staff: "Jordan Reyes" },
  { id: "a4", customer: "Tom Becker", service: "Massage", date: d(1, 10, 0), duration: 60, status: "confirmed", staff: "Alex Park" },
  { id: "a5", customer: "Hana Ito", service: "Haircut", date: d(1, 15, 30), duration: 30, status: "cancelled", staff: "Mia Chen" },
  { id: "a6", customer: "Diego Alvarez", service: "Consultation", date: d(2, 9, 0), duration: 45, status: "confirmed", staff: "Mia Chen" },
  { id: "a7", customer: "Nora Bell", service: "Color treatment", date: d(2, 13, 0), duration: 90, status: "confirmed", staff: "Jordan Reyes" },
  { id: "a8", customer: "Owen West", service: "Massage", date: d(3, 11, 30), duration: 60, status: "pending", staff: "Alex Park" },
  { id: "a9", customer: "Ivy Park", service: "Haircut", date: d(4, 10, 0), duration: 30, status: "confirmed", staff: "Mia Chen" },
  { id: "a10", customer: "Leo Tran", service: "Consultation", date: d(4, 14, 30), duration: 45, status: "confirmed", staff: "Jordan Reyes" },
];
