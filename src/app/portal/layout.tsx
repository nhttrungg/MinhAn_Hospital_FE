import "@/styles/screens/ops.css";
import "@/styles/screens/clinical.css";
import "@/styles/areas/portal.css";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <PortalLayout>{children}</PortalLayout>
    </PublicShell>
  );
}
