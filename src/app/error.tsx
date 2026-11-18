"use client";
import { useEffect } from "react";
import { StatusScreen } from "@/components/layout/status-screen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusScreen
      title="Đã xảy ra lỗi"
      description={
        <>
          Hệ thống chưa hiển thị được trang này. Dữ liệu của bạn không bị thay đổi.
          {error.digest ? ` Mã lỗi: ${error.digest}.` : ""}
        </>
      }
      reset={reset}
    />
  );
}
