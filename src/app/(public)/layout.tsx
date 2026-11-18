import { PublicCatalogBoundary } from "@/components/layout/public-catalog-boundary";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/public-shell";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <PublicCatalogBoundary>
      <PublicShell>{children}</PublicShell>
    </PublicCatalogBoundary>
  );
}
