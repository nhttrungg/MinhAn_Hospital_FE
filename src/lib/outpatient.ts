export function vietnamDate(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 86400000));
}
export const appointmentLabels: Record<string, string> = {
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã tiếp nhận",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Vắng hẹn",
  NEEDS_RESCHEDULE: "Cần đổi lịch",
};
export const encounterLabels: Record<string, string> = {
  WAITING: "Chờ khám",
  IN_PROGRESS: "Đang khám",
  WAITING_RESULTS: "Chờ kết quả",
  COMPLETED: "Hoàn tất",
};
export const invoiceLabels: Record<string, string> = {
  OPEN: "Chưa thu",
  PARTIAL: "Thu một phần",
  PAID: "Đã thu đủ",
  VOID: "Đã hủy",
};
export type Encounter = {
  nurseStaffId: number | null;
  nurseName: string | null;
  id: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentCode: string;
  status: string;
  revision: number;
  chiefComplaint: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  vitals: string | null;
  diagnosis: string | null;
  conclusion: string | null;
  patientMedicalHistory: string | null;
  patientAllergies: string | null;
  startedAt: string | null;
  completedAt: string | null;
  instructions: string | null;
  followUpDate: string | null;
  amendments: {
    id: number;
    reason: string;
    content: string;
    createdAt: string;
    authorName?: string;
  }[];
};
export type Medication = {
  id: number;
  code: string;
  name: string;
  ingredient: string;
  strength: string;
  form: string;
  unit: string;
  active: boolean;
};
export type NurseReference = { id: number; fullName: string; departmentName: string };
export type PrescriptionLine = {
  id?: number;
  medicationId: number;
  name?: string;
  strength?: string;
  unit?: string;
  dose: string;
  route: string;
  frequency: string;
  days: number;
  quantity: string;
  instructions: string | null;
};
export type Prescription = {
  id: number;
  encounterId: number;
  version: number;
  revision: number;
  status: string;
  reason: string | null;
  authorName: string;
  createdAt: string;
  finalizedAt: string | null;
  lines: PrescriptionLine[];
};
export type Receipt = {
  id: number;
  code: string;
  invoiceId: number;
  amount: string;
  method: string;
  recordedAt: string;
};
export type Invoice = {
  id: number;
  code: string;
  patientId: number;
  patientName: string;
  appointmentId: number | null;
  status: string;
  total: string;
  paid: string;
  balance: string;
  lines: {
    id: number;
    sourceType: string;
    description: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    status: string;
  }[];
  receipts: Receipt[];
};
export type Notification = {
  id: number;
  appointmentId: number | null;
  kind?: string;
  link?: string | null;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
export type Report = {
  booked: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: string;
  balance: string;
  doctors: {
    doctorId: number;
    doctorName: string;
    booked: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    noShow: number;
    ratingAverage: number | null;
    ratingCount: number;
  }[];
};
