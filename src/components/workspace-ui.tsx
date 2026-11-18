"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";
import { Button } from "./ui";
import { useClinic } from "@/lib/public-clinic";
import Image from "next/image";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data-display";

export function useUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<CurrentUser>("/api/v1/auth/me", { signal }),
    retry: false,
  });
}
export function QueryState({
  loading,
  error,
  empty,
  retry,
  emptyTitle = "Chưa có dữ liệu phù hợp",
  emptyDescription = "Thử thay đổi bộ lọc hoặc chọn khoảng ngày khác.",
}: {
  loading: boolean;
  error: Error | null;
  empty?: boolean;
  retry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (error) return <ErrorState error={error} retry={retry} />;
  if (loading) return <Skeleton />;
  return empty ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null;
}
export function PrintButton({ label = "In / Lưu PDF" }: { label?: string }) {
  return (
    <Button type="button" className="no-print" variant="ghost" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

export function PrintLetterhead() {
  const clinic = useClinic();
  return (
    <div className="mb-4 border-b border-line pb-3 text-sm">
      <Image
        src="/images/brand/minh-an-logo.png"
        alt="Logo Bệnh viện Minh An"
        width={44}
        height={44}
        unoptimized
      />
      <p className="font-semibold">{clinic.data?.name ?? "MINH AN CLINIC"}</p>
      <p>{clinic.data?.address}</p>
      <p>{[clinic.data?.phone, clinic.data?.email].filter(Boolean).join(" · ")}</p>
    </div>
  );
}
