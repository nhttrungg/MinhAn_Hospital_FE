import type { Metadata } from "next";
import { DoctorsPage } from "@/components/customer/public-pages";

export const metadata: Metadata = { title: "Đội ngũ bác sĩ" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; specialtyId?: string }>;
}) {
  const params = await searchParams;
  return (
    <DoctorsPage
      key={`${params.keyword ?? ""}-${params.specialtyId ?? ""}`}
      keyword={params.keyword}
      specialtyId={Number(params.specialtyId) || 0}
    />
  );
}
