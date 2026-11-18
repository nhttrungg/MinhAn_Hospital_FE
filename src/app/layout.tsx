import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@/styles/tokens/primitives.css";
import "@/styles/tokens/semantic.css";
import "@/styles/tokens/theme-dark.css";
import "@/styles/base/globals.css";
import "@/styles/base/fonts.css";
import "@/styles/shared/design-system.css";
import "@/styles/shared/app-ui.css";

export const metadata: Metadata = {
  title: {
    default: "Bệnh viện Minh An",
    template: "%s · Minh An",
  },
  description: "Hệ thống quản lý bệnh viện Minh An",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
