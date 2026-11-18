"use client";
import { PageHeader } from "@/components/ui/data-display";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Card, Field, Notice, PasswordField, Form } from "./ui";

export function PasswordForm({ portal = false }: { portal?: boolean }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const cache = useQueryClient();
  async function save(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(form) });
      cache.clear();
      router.replace(`${portal ? "/login" : "/login/staff"}?passwordChanged=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được mật khẩu.");
    } finally {
      setBusy(false);
    }
  }
  const Container = portal ? "main" : "section";
  return (
    <Container className="max-w-2xl space-y-5">
      <PageHeader
        eyebrow={portal ? "Tài khoản của tôi" : "Bảo mật"}
        title={<>Đổi mật khẩu</>}
        description="Sử dụng mật khẩu tối thiểu 8 ký tự để bảo vệ tài khoản của bạn."
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <Form onSubmit={save} className="space-y-4">
          {(
            [
              ["currentPassword", "Mật khẩu hiện tại"],
              ["newPassword", "Mật khẩu mới"],
              ["confirm", "Nhập lại mật khẩu mới"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <PasswordField
                autoComplete={key === "currentPassword" ? "current-password" : "new-password"}
                required
                minLength={key === "currentPassword" ? undefined : 8}
                maxLength={72}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
          <div className="space-y-2 pt-2">
            <Button disabled={busy} type="submit">
              Đổi mật khẩu
            </Button>
            <p className="text-xs text-muted">
              Hệ thống sẽ chuyển về trang đăng nhập sau khi đổi mật khẩu thành công.
            </p>
          </div>
        </Form>
      </Card>
    </Container>
  );
}
