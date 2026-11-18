import type { Metadata } from "next";
import { AboutPage } from "@/components/customer/public-pages";

export const metadata: Metadata = { title: "Giới thiệu" };
export default function Page() {
  return <AboutPage />;
}
