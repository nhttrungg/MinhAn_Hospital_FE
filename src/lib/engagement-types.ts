import type { Doctor, Patient } from "./types";

export type FamilyPatient = Patient & { relationship: string };
export type FamilyInput = {
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  relationship: string;
};
export type WaitlistInput = {
  patientId?: number | null;
  serviceId?: number | null;
  specialtyId?: number | null;
  doctorId?: number | null;
  dateFrom: string;
  dateTo: string;
};
export type WaitlistEntry = WaitlistInput & {
  id: number;
  patientId: number;
  patientName: string;
  status: string;
  doctorName?: string | null;
  serviceName?: string | null;
  specialtyName?: string | null;
  notifiedAt: string | null;
  notifiedSlotId: number | null;
  createdAt: string;
};
export type DoctorRating = { ratingAverage?: number | null; ratingCount?: number };
export type RatedDoctor = Doctor & DoctorRating;
export type PatientReview = {
  id: number;
  encounterId: number | null;
  patientId: number | null;
  doctorId: number;
  rating: number;
  comment: string | null;
  patientName: string;
  createdAt: string;
  visible: boolean;
};
export type StaffReview = PatientReview & {
  doctorName?: string;
};
export type ReviewPage<T = PatientReview> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};
