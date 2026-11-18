import { WaitlistWorkspace } from "@/components/customer/waitlist-workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const number = (value: string | string[] | undefined) =>
    Number(typeof value === "string" ? value : "") || 0;
  return (
    <WaitlistWorkspace
      defaults={{
        patientId: number(p.patientId),
        doctorId: number(p.doctorId),
        serviceId: number(p.serviceId),
        specialtyId: number(p.specialtyId),
        dateFrom: typeof p.date === "string" ? p.date : undefined,
      }}
    />
  );
}
