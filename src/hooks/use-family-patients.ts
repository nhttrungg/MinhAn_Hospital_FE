"use client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/components/workspace-ui";
import { api } from "@/lib/api";
import type { FamilyPatient } from "@/lib/engagement-types";
import type { Patient } from "@/lib/types";

export function useFamilyPatients() {
  const me = useUser();
  const enabled = me.data?.userType === "PATIENT";
  const self = useQuery({
    queryKey: ["patient-me", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Patient>("/api/v1/patients/me", { signal }),
    enabled,
  });
  const family = useQuery({
    queryKey: ["patient-family", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<FamilyPatient[]>("/api/v1/patients/me/family", { signal }),
    enabled,
  });
  return { self, family, enabled };
}
