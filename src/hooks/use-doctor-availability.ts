"use client";
import { useQuery } from "@tanstack/react-query";
import { api, queryString } from "@/lib/api";
import type { Slot } from "@/lib/types";

const DAY = 86_400_000;
const zone = "Asia/Ho_Chi_Minh";

export type AvailabilityDay = {
  /** yyyy-MM-dd in clinic time, usable as the booking `date` parameter. */
  date: string;
  label: string;
  times: string[];
  total: number;
};

function clinicDate(value: Date) {
  return value.toLocaleDateString("sv-SE", { timeZone: zone });
}

/** Read-only view of the published slots a visitor may book in the next two weeks. */
export function useDoctorAvailability(doctorId: number, days = 14) {
  return useQuery({
    queryKey: ["public-doctor-availability", doctorId, days],
    enabled: doctorId > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const from = new Date();
      const to = new Date(from.getTime() + days * DAY);
      const slots = await api<Slot[]>(
        `/api/v1/slots${queryString({ from: from.toISOString(), to: to.toISOString(), doctorId })}`,
        { signal },
      );
      const groups = new Map<string, AvailabilityDay>();
      for (const slot of [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
        const start = new Date(slot.startsAt);
        if (!slot.available || start <= from) continue;
        const date = clinicDate(start);
        const group = groups.get(date) ?? {
          date,
          label: start.toLocaleDateString("vi-VN", {
            timeZone: zone,
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          }),
          times: [],
          total: 0,
        };
        group.total += 1;
        group.times.push(
          start.toLocaleTimeString("vi-VN", {
            timeZone: zone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        );
        groups.set(date, group);
      }
      return [...groups.values()];
    },
  });
}
