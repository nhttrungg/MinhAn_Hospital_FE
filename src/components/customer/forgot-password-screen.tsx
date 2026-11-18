"use client";
import { AuthLayout } from "@/components/layout/auth-layout";

import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import { Button, Card, Field, Notice, TextInput, Form } from "@/components/ui";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await api<{ message: string }>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setIsError(false);
      setMessage(result.message);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof ApiError ? error.message : "Không gửi được yêu cầu.");
    }
  }
  return (
    <AuthLayout
      title="Quên mật khẩu"
      description="Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu."
    >
      {message ? <Notice tone={isError ? "error" : "success"}>{message}</Notice> : null}
      <Card>
        <Form onSubmit={submit} className="space-y-4">
          <Field label="Email tài khoản">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button type="submit">Gửi hướng dẫn</Button>
        </Form>
      </Card>
    </AuthLayout>
  );
}
