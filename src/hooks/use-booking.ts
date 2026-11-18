"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, queryString } from "@/lib/api";
import type { Appointment, Doctor, Patient, Slot, Specialty } from "@/lib/types";
import { vietnamDate } from "@/lib/outpatient";
import { useUser } from "@/components/workspace-ui";
import { useDebouncedValue } from "./use-debounced-value";
import { useFamilyPatients } from "./use-family-patients";
export type BookingProps = {
  initialDoctorId?: number;
  initialSpecialtyId?: number;
  initialServiceId?: number;
  initialDate?: string;
  rescheduleId?: number;
  initialPatientId?: number;
  initialSlotId?: number;
  followUp?: boolean;
};
export function useBooking({
  initialDoctorId = 0,
  initialSpecialtyId = 0,
  initialServiceId = 0,
  initialDate,
  rescheduleId = 0,
  initialPatientId = 0,
  initialSlotId = 0,
  followUp = false,
}: BookingProps) {
  const router = useRouter();
  const cache = useQueryClient();
  const keys = useRef(new Map<string, string>());
  const me = useUser();
  const reception = me.data?.roles.includes("RECEPTIONIST") ?? false;
  const [step, setStep] = useState(initialSlotId ? 3 : 1);
  const [mode, setMode] = useState(initialDoctorId ? "doctor" : "specialty");
  const [date, setDate] = useState(initialDate || vietnamDate(1));
  const [specialtyId, setSpecialtyId] = useState(initialSpecialtyId);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [selectedId, setSelectedId] = useState(initialSlotId);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientSearch, setPatientSearch] = useState("");
  const settledSearch = useDebouncedValue(patientSearch);
  const [symptoms, setSymptoms] = useState(followUp ? "Tái khám theo hẹn của bác sĩ." : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Appointment | null>(null);
  const specialties = useQuery({
    queryKey: ["specialties"],
    queryFn: ({ signal }) => api<Specialty[]>("/api/v1/specialties", { signal }),
    staleTime: 60_000,
  });
  const doctors = useQuery({
    queryKey: ["doctors", specialtyId],
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      api<Doctor[]>(`/api/v1/doctors${queryString({ specialtyId: specialtyId || null })}`, {
        signal,
      }),
  });
  const start = new Date(`${date || vietnamDate(1)}T00:00:00+07:00`);
  const slots = useQuery({
    queryKey: ["slots", date, doctorId, serviceId, specialtyId],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: ({ signal }) =>
      api<Slot[]>(
        `/api/v1/slots${queryString({ from: start.toISOString(), to: new Date(start.getTime() + 86400000).toISOString(), doctorId: doctorId || null, serviceId: serviceId || null, specialtyId: specialtyId || null })}`,
        { signal },
      ),
  });
  const patients = useQuery({
    queryKey: ["patients", me.data?.id, settledSearch],
    queryFn: ({ signal }) =>
      api<Patient[]>(`/api/v1/patients${queryString({ q: settledSearch })}`, { signal }),
    enabled: reception,
  });
  const { self: patient, family } = useFamilyPatients();
  const old = useQuery({
    queryKey: ["appointment", rescheduleId, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Appointment>(`/api/v1/appointments/${rescheduleId}`, { signal }),
    enabled: !!rescheduleId && !!me.data,
  });
  const selected = slots.data?.find((s) => s.id === selectedId);
  const bookingPatientId = rescheduleId ? old.data?.patientId : patientId;
  const person = reception
    ? patients.data?.find((p) => p.id === bookingPatientId)
    : !bookingPatientId || bookingPatientId === patient.data?.id
      ? patient.data
      : family.data?.find((p) => p.id === bookingPatientId && p.active);
  function choose(slot: Slot) {
    setSelectedId(slot.id);
    setError("");
    if (!me.data) {
      const next = `/booking${queryString({ doctorId: slot.doctorId, serviceId: slot.serviceId, specialtyId: specialtyId || null, date, reschedule: rescheduleId || null, slotId: slot.id, patientId: patientId || null, followUp: followUp || null })}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setStep(3);
  }
  async function confirm() {
    if (busy || !selected) return;
    if (me.data?.userType !== "PATIENT" && !reception) {
      setError("Chỉ bệnh nhân hoặc lễ tân có thể đặt lịch.");
      return;
    }
    if (!rescheduleId && reception && !patientId) {
      setError("Chọn hồ sơ bệnh nhân để đặt hộ.");
      return;
    }
    if (!rescheduleId && !person) {
      setError("Chọn hồ sơ người khám hợp lệ trước khi xác nhận.");
      return;
    }
    if (rescheduleId && !old.isSuccess) {
      setError("Chờ tải lịch hẹn hiện tại trước khi đổi lịch.");
      return;
    }
    if (!selected.available || new Date(selected.startsAt).getTime() <= Date.now()) {
      setError("Giờ khám không còn khả dụng. Vui lòng chọn giờ khác.");
      setStep(2);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const request = rescheduleId
        ? { slotId: selected.id }
        : { slotId: selected.id, patientId: patientId || null, symptoms };
      const requestKey = JSON.stringify({ rescheduleId, ...request });
      let key = keys.current.get(requestKey);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(requestKey, key);
      }
      const data = await api<Appointment>(
        rescheduleId ? `/api/v1/appointments/${rescheduleId}/reschedule` : "/api/v1/appointments",
        {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: JSON.stringify(request),
        },
      );
      keys.current.delete(requestKey);
      setResult(data);
      await cache.invalidateQueries({ queryKey: ["appointments"] });
      await cache.invalidateQueries({ queryKey: ["slots"] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setStep(2);
        setSelectedId(0);
        setError(
          "Giờ khám vừa được người khác chọn. Thông tin người khám và lý do khám vẫn được giữ. Vui lòng chọn giờ khác để tiếp tục.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Không đặt được lịch. Vui lòng thử lại.");
      }
      await slots.refetch();
    } finally {
      setBusy(false);
    }
  }
  return {
    step,
    setStep,
    mode,
    setMode,
    date,
    setDate,
    specialtyId,
    setSpecialtyId,
    doctorId,
    setDoctorId,
    serviceId,
    setServiceId,
    selected,
    patientId,
    setPatientId,
    patientSearch,
    setPatientSearch,
    symptoms,
    setSymptoms,
    busy,
    error,
    result,
    specialties,
    doctors,
    slots,
    patients,
    patient,
    family,
    person,
    old,
    reception,
    me,
    choose,
    confirm,
    rescheduleId,
    followUp,
  };
}
export type BookingState = ReturnType<typeof useBooking>;
