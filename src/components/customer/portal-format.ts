import type { Appointment } from "@/lib/types";

const TZ = "Asia/Ho_Chi_Minh";
const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const longDateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const weekdayFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, weekday: "short" });
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

/** "08:30" in Vietnam time. */
export function formatTime(value: string | Date): string {
  return timeFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** "Thứ Bảy, 03/10/2026" in Vietnam time. */
export function formatLongDate(value: string | Date): string {
  return longDateFormat.format(typeof value === "string" ? new Date(value) : value);
}

export function formatWeekday(value: string | Date): string {
  return weekdayFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** YYYY-MM-DD of an instant in Vietnam time. */
export function dayKey(value: string | Date): string {
  return dayKeyFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** Shifts a YYYY-MM-DD date by whole days (calendar arithmetic, timezone safe). */
export function shiftDay(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Whole calendar days from today (Vietnam time) to the given instant. */
export function daysUntil(value: string): number {
  const target = Date.parse(`${dayKey(value)}T00:00:00Z`);
  const today = Date.parse(`${dayKey(new Date())}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

export function relativeDay(value: string): string {
  const days = daysUntil(value);
  if (days < 0) return "Đã qua";
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  return `Còn ${days} ngày`;
}

export const bringList = [
  "Căn cước công dân hoặc giấy tờ tùy thân",
  "Thẻ bảo hiểm y tế (nếu có)",
  "Đơn thuốc, kết quả khám hoặc xét nghiệm gần đây (nếu có)",
  "Mã lịch khám hoặc mã QR để được tiếp nhận nhanh",
  "Đến sớm 10–15 phút để làm thủ tục tiếp nhận",
];

export const changePolicy =
  "Bạn có thể đổi hoặc hủy lịch trước giờ khám và trước khi được tiếp nhận tại cơ sở.";

function icsStamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([,;])/g, "\\$1")
    .replace(/\r?\n/g, "\\n");
}

/** Builds an iCalendar file so the patient can add the visit to a personal calendar. */
export function appointmentIcs(a: Pick<Appointment, "code" | "slot">): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Minh An Clinic//Appointment//VI",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${a.code}@antam-clinic`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(a.slot.startsAt)}`,
    `DTEND:${icsStamp(a.slot.endsAt)}`,
    `SUMMARY:${icsText(`Khám tại Minh An - ${a.slot.doctorName}`)}`,
    `LOCATION:${icsText(`Minh An Clinic - ${a.slot.roomName}`)}`,
    `DESCRIPTION:${icsText(`Mã lịch khám ${a.code}. Dịch vụ: ${a.slot.serviceName}. Mang theo giấy tờ tùy thân và thẻ BHYT (nếu có).`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("Sắp đến giờ khám tại Minh An")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcs(a: Pick<Appointment, "code" | "slot">): void {
  const blob = new Blob([appointmentIcs(a)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lich-kham-${a.code}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type PasswordCheck = { id: string; label: string; ok: boolean };

/** Mirrors the server rule (8–72 chars, at least one letter and one digit) plus a strength hint. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { id: "length", label: "Từ 8 đến 72 ký tự", ok: password.length >= 8 && password.length <= 72 },
    { id: "letter", label: "Có ít nhất một chữ cái", ok: /\p{L}/u.test(password) },
    { id: "digit", label: "Có ít nhất một chữ số", ok: /\p{N}/u.test(password) },
  ];
}

/** 0–4 score used only for the visual strength meter; the server rule is authoritative. */
export function passwordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "Chưa nhập" };
  const checks = passwordChecks(password);
  if (!checks.every((c) => c.ok)) return { score: 1, label: "Chưa đạt yêu cầu" };
  let score = 2;
  if (password.length >= 12) score += 1;
  if (/[^\p{L}\p{N}]/u.test(password) && /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) {
    score += 1;
  }
  score = Math.min(score, 4);
  return { score, label: score >= 4 ? "Mạnh" : score === 3 ? "Khá" : "Đạt yêu cầu" };
}
