"use client";
import { useEffect } from "react";
import { StatusScreen } from "@/components/layout/status-screen";

export default function PortalError({
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
      title="Không mở được trang này"
      description={
        <>
          Vui lòng thử lại. Nếu lỗi còn lặp lại, hãy liên hệ phòng khám để được hỗ trợ.
          {error.digest ? ` Mã lỗi: ${error.digest}.` : ""}
        </>
      }
      reset={reset}
      homeHref="/portal"
      homeLabel="Về tài khoản của tôi"
    />
  );
}
