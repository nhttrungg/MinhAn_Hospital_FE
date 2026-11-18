"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button, ButtonLink, Card, Field, Notice, TextInput } from "@/components/ui";
import { PasswordField } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/data-display";
import { QueryState } from "@/components/workspace-ui";
import { Disclosure } from "@/components/ui/disclosure";

export function AccountSecurity() {
  const status = useQuery({
    queryKey: ["mfa-status"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ enabled: boolean }>("/api/v1/auth/mfa/status", { signal }),
    retry: false,
  });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ secret: string; image: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function action(kind: "setup" | "enable" | "disable") {
    setBusy(true);
    setError("");
    try {
      if (kind === "setup") {
        const result = await api<{ secret: string; image: string }>("/api/v1/auth/mfa/setup", {
          method: "POST",
          body: JSON.stringify({ password }),
        });
        setSetup(result);
        setPassword("");
      } else if (kind === "enable") {
        const result = await api<{ recoveryCodes: string[] }>("/api/v1/auth/mfa/enable", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        setCodes(result.recoveryCodes);
        setSetup(null);
        setCode("");
        setDone(true);
      } else {
        await api("/api/v1/auth/mfa/disable", {
          method: "POST",
          body: JSON.stringify({ password }),
        });
        setPassword("");
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(["Minh An — mã khôi phục 2FA (mỗi mã dùng một lần)\n\n" + codes.join("\n")], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "antam-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="space-y-6">
      <PageHeader
        title="Bảo mật tài khoản"
        description="Xác thực hai bước bằng ứng dụng Authenticator."
      />
      <Card className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {done ? (
          <>
            <Notice tone="success">
              Đã cập nhật bảo mật. Các phiên cũ đã kết thúc. Hãy đăng nhập lại.
            </Notice>
            {codes.length > 0 && (
              <>
                <p>Lưu mã khôi phục ở nơi riêng tư. Mỗi mã dùng một lần và chỉ hiển thị lúc này.</p>
                <pre className="whitespace-pre-wrap select-all">{codes.join("\n")}</pre>
                <Button type="button" onClick={download}>
                  Tải mã khôi phục
                </Button>
              </>
            )}
            <ButtonLink href="/login/staff">Đăng nhập lại</ButtonLink>
          </>
        ) : (
          <>
            <QueryState
              loading={status.isLoading}
              error={status.error}
              retry={() => void status.refetch()}
            />
            {status.data && (
              <>
                <p>
                  2FA: <strong>{status.data.enabled ? "Đang bật" : "Chưa bật"}</strong>. Đăng nhập
                  sai 5 lần sẽ khóa 15 phút.
                </p>
                {!setup && (
                  <>
                    <Field label="Mật khẩu hiện tại">
                      <PasswordField
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                    <Button
                      type="button"
                      disabled={busy || !password}
                      onClick={() => action(status.data!.enabled ? "disable" : "setup")}
                    >
                      {status.data.enabled ? "Tắt 2FA" : "Thiết lập 2FA"}
                    </Button>
                  </>
                )}
                {setup && (
                  <>
                    <p>
                      Quét QR trong ứng dụng xác thực, sau đó nhập mã 6 số. QR thiết lập hết hạn sau
                      5 phút.
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setup.image}
                      width={240}
                      height={240}
                      alt="QR thiết lập ứng dụng xác thực"
                    />
                    <Disclosure title="Nhập khóa thủ công">
                      <code className="break-all select-all">{setup.secret}</code>
                    </Disclosure>
                    <Field label="Mã xác thực 6 số">
                      <TextInput
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </Field>
                    <Button
                      type="button"
                      disabled={busy || !/^\d{6}$/.test(code)}
                      onClick={() => action("enable")}
                    >
                      Bật 2FA
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setSetup(null);
                        setCode("");
                      }}
                    >
                      Hủy thiết lập
                    </Button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
