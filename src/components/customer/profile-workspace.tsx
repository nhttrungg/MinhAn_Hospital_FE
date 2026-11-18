"use client";
import { useUser } from "@/components/workspace-ui";
import { PageHeader } from "@/components/ui/data-display";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError, api } from "@/lib/api";
import type { Patient } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  Notice,
  SelectInput,
  TextArea,
  TextInput,
  Form,
} from "@/components/ui";

export function ProfileWorkspace() {
  const me = useUser();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["patient-me", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Patient>("/api/v1/patients/me", { signal }),
  });
  const [form, setForm] = useState<Patient | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = form ?? profile.data ?? null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      await api<Patient>(`/api/v1/patients/${draft.id}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patient-me"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      setForm(null);
      setMessage("Đã lưu hồ sơ.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Không lưu được hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Tài khoản của tôi"
        title={<>Hồ sơ cá nhân</>}
        description="Cập nhật thông tin liên hệ, dị ứng và tiền sử bệnh để phục vụ tiếp nhận."
      />
      {profile.error instanceof ApiError ? (
        <Notice tone="error">{profile.error.message}</Notice>
      ) : null}
      {message ? (
        <Notice tone={message === "Đã lưu hồ sơ." ? "success" : "error"}>{message}</Notice>
      ) : null}
      {draft ? (
        <Card>
          <Form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-muted">Mã bệnh nhân: {draft.code}</p>
            <Field label="Họ và tên">
              <TextInput
                required
                value={draft.fullName}
                onChange={(event) => setForm({ ...draft, fullName: event.target.value })}
              />
            </Field>
            <Field label="Số điện thoại">
              <TextInput
                value={draft.phone ?? ""}
                onChange={(event) => setForm({ ...draft, phone: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={draft.email ?? ""}
                onChange={(event) => setForm({ ...draft, email: event.target.value })}
              />
            </Field>
            <Field label="Ngày sinh">
              <TextInput
                type="date"
                value={draft.dateOfBirth ?? ""}
                onChange={(event) => setForm({ ...draft, dateOfBirth: event.target.value || null })}
              />
            </Field>
            <Field label="Giới tính">
              <SelectInput
                value={draft.gender ?? ""}
                onChange={(event) => setForm({ ...draft, gender: event.target.value || null })}
              >
                <option value="">Chưa chọn</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </SelectInput>
            </Field>
            <Field label="Địa chỉ">
              <TextInput
                value={draft.address ?? ""}
                onChange={(event) => setForm({ ...draft, address: event.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Dị ứng">
                <TextArea
                  value={draft.allergies ?? ""}
                  onChange={(event) => setForm({ ...draft, allergies: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Tiền sử bệnh">
                <TextArea
                  value={draft.medicalHistory ?? ""}
                  onChange={(event) => setForm({ ...draft, medicalHistory: event.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button disabled={busy} type="submit">
                {busy ? "Đang lưu…" : "Lưu hồ sơ"}
              </Button>
            </div>
          </Form>
        </Card>
      ) : null}
    </main>
  );
}
