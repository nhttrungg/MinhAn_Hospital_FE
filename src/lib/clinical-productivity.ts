import type { ClinicalEncounter, SafetyPrescription } from "./clinical-safety";
export type ClinicalTemplate = {
  id: number;
  ownerStaffId: number | null;
  specialtyId: number;
  name: string;
  state: string;
  version: number;
  chiefComplaint: string | null;
  diagnosis: string | null;
  conclusion: string | null;
  instructions: string | null;
  authorName: string;
  updatedAt: string;
};
export const templateFields = [
  ["chiefComplaint", "Lý do khám"],
  ["diagnosis", "Chẩn đoán"],
  ["conclusion", "Kết luận"],
  ["instructions", "Hướng dẫn"],
] as const;
export type TemplateApplication = { templateId: number; version: number };
export type ChartSaved = { data: ClinicalEncounter; revision: number; savedAt: string };
export type RxSaved = { data: SafetyPrescription; revision: number; savedAt: string };
export type Source = { content: string | null; recordedAt: string | null; href: string | null };
export type PatientSummary = {
  age: number | null;
  medicalHistory: Source;
  allergies: Source;
  allergyDetails: Source[];
  vitals: Source;
  lastCompletedVisit: Source;
  diagnosis: Source;
  prescribedMedications: {
    name: string;
    strength: string;
    dose: string;
    frequency: string;
    quantity: string;
    prescribedAt: string;
    href: string;
  }[];
};
export type DiagnosticPoint = {
  resultId: number;
  orderId: number;
  encounterId: number;
  serviceId: number;
  serviceName: string;
  definitionId: number | null;
  name: string;
  value: string;
  numericValue: number | null;
  unit: string;
  referenceRange: string;
  publishedAt: string;
  href: string;
  comparable: boolean;
};
export type DiagnosticHistory = { points: DiagnosticPoint[]; ambiguousMeasurements: number };
export type Availability = {
  checkedAt: string;
  medications: {
    medicationId: number;
    unit: string;
    available: number;
    counters: { counterId: number; counterName: string; available: number }[];
  }[];
};
export function applyTemplate<T extends ClinicalEncounter>(
  form: T,
  template: ClinicalTemplate,
  overwrite: readonly string[],
): T {
  const next = { ...form };
  for (const [key] of templateFields)
    if (!form[key]?.trim() || overwrite.includes(key)) next[key] = template[key];
  return next;
}
export function measurementGroup(p: DiagnosticPoint) {
  return `${p.serviceId}:${p.definitionId ?? `unknown-${p.resultId}-${p.name}`}:${p.unit}`;
}
