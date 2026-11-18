"use client";
import { AuthLayout } from "@/components/layout/auth-layout";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { Button, Card, Field, Notice, PasswordField, ButtonLink, Form } from "@/components/ui";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await api<{ message: string }>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setIsError(false);
      setMessage(result.message);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof ApiError ? error.message : "Không đổi được mật khẩu.");
    }
  }
  return (
    <div className="space-y-4">
      {message ? <Notice tone={isError ? "error" : "success"}>{message}</Notice> : null}
      <Card>
        <Form onSubmit={submit} className="space-y-4">
          <Field label="Mật khẩu mới">
            <PasswordField
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button disabled={!token} type="submit">
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
      <ButtonLink href="/login" variant="ghost">
        Đăng nhập
      </ButtonLink>
    </div>
  );
}

export function ResetPasswordScreen() {
  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      description="Tạo mật khẩu mới để tiếp tục sử dụng tài khoản của bạn."
    >
      <Suspense fallback={<Notice>Đang tải…</Notice>}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
