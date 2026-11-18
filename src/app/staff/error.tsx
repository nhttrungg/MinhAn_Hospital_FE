"use client";
import { useEffect } from "react";
import { StatusScreen } from "@/components/layout/status-screen";

export default function StaffError({
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
      title="Màn hình này gặp lỗi"
      description={
        <>
          Bạn có thể thử lại hoặc quay về trang tổng quan. Thao tác đang dở chưa được lưu.
          {error.digest ? ` Mã lỗi: ${error.digest}.` : ""}
        </>
      }
      reset={reset}
      homeHref="/staff"
      homeLabel="Về tổng quan"
    />
  );
}
