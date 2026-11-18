import type { Metadata } from "next";
import { FaqPage } from "@/components/customer/public-pages";

export const metadata: Metadata = { title: "Hỏi đáp" };
export default function Page() {
  return <FaqPage />;
}
