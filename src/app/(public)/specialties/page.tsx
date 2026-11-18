import type { Metadata } from "next";
import { SpecialtiesPage } from "@/components/customer/public-pages";

export const metadata: Metadata = { title: "Chuyên khoa" };
export default function Page() {
  return <SpecialtiesPage />;
}
