import type { Metadata } from "next";
import { ContactPage } from "@/components/customer/public-pages";

export const metadata: Metadata = { title: "Liên hệ" };
export default function Page() {
  return <ContactPage />;
}
