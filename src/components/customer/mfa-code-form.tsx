"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";
import { Button, Field, Form, Notice, TextInput } from "@/components/ui";

export function MfaCodeForm({
  onSuccess,
  onRestart,
}: {
  onSuccess: (user: CurrentUser) => void;
  onRestart: () => void;
}) {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!(recovery ? /^[a-fA-F0-9]{20}$/ : /^[0-9]{6}$/).test(code.trim())) {
      setError(recovery ? "Nhập mã khôi phục 20 ký tự." : "Nhập đủ 6 chữ số.");
      return;
    }
    setBusy(true);
    try {
      const user = await api<CurrentUser>("/api/v1/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      onSuccess(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xác thực được.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form className="space-y-4" onSubmit={submit}>
      <p>Nhập mã từ ứng dụng xác thực để hoàn tất đăng nhập. Yêu cầu hết hạn sau 5 phút.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <Field label={recovery ? "Mã khôi phục" : "Mã xác thực 6 số"}>
        <TextInput
          autoFocus
          autoComplete="one-time-code"
          inputMode={recovery ? "text" : "numeric"}
          maxLength={recovery ? 20 : 6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Đang xác thực..." : "Xác thực"}
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setRecovery(!recovery);
            setCode("");
            setError("");
          }}
        >
          {recovery ? "Dùng ứng dụng xác thực" : "Dùng mã khôi phục"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onRestart}>
          Đăng nhập lại
        </Button>
      </div>
    </Form>
  );
}
