import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Doctor, Specialty } from "./types";

export type ClinicInfo = {
  demoData?: boolean;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  workingHours: string | null;
  website?: string | null;
  contactPhones?: { code: string; label: string; phone: string }[];
};

export function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function useClinic() {
  return useQuery({
    queryKey: ["public-clinic"],
    queryFn: ({ signal }) => api<ClinicInfo>("/api/v1/public/clinic", { signal }),
    staleTime: 60_000,
  });
}

export function useDirectory() {
  const doctors = useQuery({
    queryKey: ["public-doctors"],
    queryFn: ({ signal }) => api<Doctor[]>("/api/v1/doctors", { signal }),
    staleTime: 60_000,
  });
  const specialties = useQuery({
    queryKey: ["specialties"],
    queryFn: ({ signal }) => api<Specialty[]>("/api/v1/specialties", { signal }),
    staleTime: 60_000,
  });
  return { doctors, specialties };
}

export function sortVietnameseName(a: string, b: string): number {
  const wordsA = a.trim().split(/\s+/);
  const wordsB = b.trim().split(/\s+/);
  const firstNameA = wordsA[wordsA.length - 1] || "";
  const firstNameB = wordsB[wordsB.length - 1] || "";
  const cmp = firstNameA.localeCompare(firstNameB, "vi", { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return a.localeCompare(b, "vi", { sensitivity: "base" });
}

export function uniqueDoctors(doctors: Doctor[]) {
  const map = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  return [...map.values()].sort((a, b) => sortVietnameseName(a.fullName, b.fullName));
}

export function searchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function filterDoctors(doctors: Doctor[], keyword: string, specialtyId: number) {
  const query = searchText(keyword);
  return uniqueDoctors(
    doctors.filter(
      (doctor) =>
        (!specialtyId || doctor.specialtyId === specialtyId) &&
        searchText(`${doctor.fullName} ${doctor.specialtyName} ${doctor.serviceName}`).includes(
          query,
        ),
    ),
  );
}

export function usePublicKnowledge() {
  return useQuery({
    queryKey: ["public-knowledge"],
    queryFn: ({ signal }) =>
      api<import("./chatbot-types").Knowledge[]>("/api/v1/public/knowledge", { signal }),
    staleTime: 60_000,
  });
}
