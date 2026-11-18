"use client";
import { type ReactNode } from "react";
import { ClinicShieldIllustration } from "@/components/ui/medical-illustrations";
import { ButtonLink, Button } from "@/components/ui/primitives";

/**
 * Full-area screen for routing and runtime failures (404, 403, unexpected errors).
 * Always offers a way out: retry (when available) and a link back to a safe page.
 */
export function StatusScreen({
  code,
  title,
  description,
  reset,
  homeHref = "/",
  homeLabel = "Về trang chủ",
  children,
}: {
  code?: string;
  title: string;
  description: ReactNode;
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
}) {
  return (
    <main className="at-status-page" id="page-content">
      <div>
        <ClinicShieldIllustration className="mx-auto mb-3" />
        {code && <p className="at-status-code">{code}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
        <div className="at-status-actions">
          {reset && <Button onClick={reset}>Thử lại</Button>}
          <ButtonLink href={homeHref} variant={reset ? "ghost" : "primary"}>
            {homeLabel}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
