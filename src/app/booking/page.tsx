import { BookingSearch } from "@/components/customer/booking-search";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    doctorId?: string;
    specialtyId?: string;
    serviceId?: string;
    date?: string;
    reschedule?: string;
    patientId?: string;
    slotId?: string;
    followUp?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <BookingSearch
      initialDoctorId={Number(params.doctorId) || 0}
      initialSpecialtyId={Number(params.specialtyId) || 0}
      initialServiceId={Number(params.serviceId) || 0}
      initialDate={params.date}
      rescheduleId={Number(params.reschedule) || 0}
      initialPatientId={Number(params.patientId) || 0}
      initialSlotId={Number(params.slotId) || 0}
      followUp={params.followUp === "true" || params.followUp === "1"}
    />
  );
}
