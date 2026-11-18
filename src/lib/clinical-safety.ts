import type { Encounter, Prescription } from "./outpatient";
export type Diagnosis = {
  code: string;
  nameVi?: string;
  nameEn?: string;
  primary: boolean;
  sourceSystem?: string;
  demo?: boolean;
};
export type ClinicalEncounter = Encounter & { diagnoses?: Diagnosis[] };
export type SafetyWarning = {
  type: "ALLERGY" | "DUPLICATE_INGREDIENT" | "INTERACTION";
  severity: string;
  message: string;
  medicationIds: number[];
};
export type SafetyPrescription = Prescription & {
  overrideReason?: string | null;
  safetyWarnings?: SafetyWarning[];
};
export type PatientAllergy = {
  id: number;
  patientId: number;
  ingredient: string;
  reaction: string | null;
  severity: string;
  revision: number;
};
export const requiresOverride = (warnings: SafetyWarning[]) =>
  warnings.some((w) => w.type === "ALLERGY" || w.severity === "MAJOR");
