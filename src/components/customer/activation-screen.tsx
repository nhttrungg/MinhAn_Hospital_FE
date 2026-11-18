"use client";
import { AuthLayout } from "@/components/layout/auth-layout";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Notice, ButtonLink } from "@/components/ui";

function Activation() {
  const token = useSearchParams().get("token");
  const [message, setMessage] = useState("Đang kích hoạt tài khoản…");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  useEffect(() => {
    if (!token) return;
    api<{ message: string }>("/api/v1/auth/activate", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        setTone("success");
        setMessage(result.message);
      })
      .catch((error) => {
        setTone("error");
        setMessage(error instanceof ApiError ? error.message : "Không kích hoạt được tài khoản.");
      });
  }, [token]);
  return (
    <div className="space-y-4">
      <Notice tone={token ? tone : "error"}>
        {token ? message : "Liên kết kích hoạt không hợp lệ."}
      </Notice>
      <ButtonLink href="/login" variant="ghost">
        Đăng nhập
      </ButtonLink>
    </div>
  );
}

export function ActivationScreen() {
  return (
    <AuthLayout
      title="Kích hoạt tài khoản"
      description="Xác nhận tài khoản để sử dụng dịch vụ tại Minh An."
    >
      <Suspense fallback={<Notice>Đang tải…</Notice>}>
        <Activation />
      </Suspense>
    </AuthLayout>
  );
}
