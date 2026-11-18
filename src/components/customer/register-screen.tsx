"use client";
import { AuthLayout } from "@/components/layout/auth-layout";

import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import {
  Button,
  Card,
  Field,
  Notice,
  TextInput,
  PasswordField,
  ButtonLink,
  Form,
} from "@/components/ui";

export function RegisterScreen() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ message: string }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setSuccess(true);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Không tạo được tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Đăng ký bệnh nhân"
      description="Tạo tài khoản để đặt lịch và theo dõi kết quả khám tại Minh An."
    >
      {message ? <Notice tone={success ? "success" : "error"}>{message}</Notice> : null}
      {!success ? (
        <Card>
          <Form className="space-y-4" onSubmit={submit}>
            <Field label="Họ và tên">
              <TextInput
                required
                maxLength={200}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </Field>
            <Field label="Tên đăng nhập">
              <TextInput
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Số điện thoại">
              <TextInput
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Mật khẩu">
              <PasswordField
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </Field>
            <Button disabled={busy} type="submit">
              {busy ? "Đang tạo…" : "Tạo tài khoản"}
            </Button>
          </Form>
        </Card>
      ) : (
        <ButtonLink href="/login" variant="ghost">
          Đăng nhập
        </ButtonLink>
      )}
    </AuthLayout>
  );
}
