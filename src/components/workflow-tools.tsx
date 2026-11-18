"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { binary, type Row, value } from "@/lib/workflow";
import { Button, Field, Notice, TextInput, ButtonLink, Form } from "./ui";
import { Dialog, DialogClose } from "@/components/ui/overlays";

export function DocumentButton({
  type,
  sourceId,
  label = "Xem / in PDF",
  autoOpen = false,
  draft = false,
}: {
  type: string;
  sourceId: number;
  label?: string;
  autoOpen?: boolean;
  draft?: boolean;
}) {
  const [documentId, setDocumentId] = useState(0),
    [history, setHistory] = useState<Row[] | null>(null),
    [open, setOpen] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const load = useCallback(async () => {
    setOpen(true);
    setBusy(true);
    setError("");
    setUrl("");
    try {
      const d = await api<{ id: number }>("/api/v1/documents", {
        method: "POST",
        body: JSON.stringify({ type, sourceId, ...(draft ? { draft: true } : {}) }),
      });
      setDocumentId(d.id);
      setHistory(null);
      const blob = await binary(`/api/v1/documents/${d.id}/pdf`);
      setUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lấy được PDF.");
    } finally {
      setBusy(false);
    }
  }, [type, sourceId, draft]);
  useEffect(() => {
    if (!autoOpen) return;
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [autoOpen, load]);
  return (
    <>
      <Button variant="ghost" type="button" onClick={() => void load()} busy={busy}>
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        size="wide"
        busy={busy}
        description="Bản PDF do máy chủ phát hành, có logo Minh An. Dùng thanh công cụ PDF để in."
        footer={
          <>
            <DialogClose>
              <Button variant="ghost">Đóng</Button>
            </DialogClose>
            {url && (
              <>
                <ButtonLink
                  variant="ghost"
                  onClick={() =>
                    void api(`/api/v1/documents/${documentId}/requests`, {
                      method: "POST",
                      body: JSON.stringify({ action: "DOWNLOAD_REQUEST" }),
                    }).catch(() => {})
                  }
                  href={url}
                  download={`an-tam-${type}-${sourceId}.pdf`}
                >
                  Tải PDF
                </ButtonLink>
                <ButtonLink
                  variant="primary"
                  onClick={() =>
                    void api(`/api/v1/documents/${documentId}/requests`, {
                      method: "POST",
                      body: JSON.stringify({ action: "PRINT_REQUEST" }),
                    }).catch(() => {})
                  }
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở PDF để in
                </ButtonLink>
              </>
            )}
          </>
        }
      >
        {error && (
          <Notice tone="error">
            {error}
            <Button onClick={() => void load()} variant="ghost">
              Thử lại
            </Button>
          </Notice>
        )}
        {busy && <p>Đang tạo tài liệu…</p>}
        {url && (
          <div className="space-y-3">
            <iframe title="PDF Minh An" src={url} className="h-[65vh] w-full border-0" />
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  setHistory(await api<Row[]>(`/api/v1/documents/${documentId}/history`));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Không đọc được lịch sử.");
                }
              }}
            >
              Lịch sử yêu cầu in / tải
            </Button>
            {history && (
              <div className="space-y-2 text-sm">
                {history.map((h, i) => (
                  <p key={i}>
                    {value(h, "actor_name")} · {value(h, "occurred_at")} ·{" "}
                    {value(h, "action") === "ISSUE"
                      ? "Phát hành"
                      : value(h, "action") === "PRINT_REQUEST"
                        ? "Yêu cầu in"
                        : "Yêu cầu tải"}
                  </p>
                ))}
                <p>Chỉ ghi nhận yêu cầu; không xác nhận máy in đã in thành công.</p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
export function QrButton({
  kind,
  sourceId,
  label = "Mã QR",
}: {
  kind: string;
  sourceId: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    [qr, setQr] = useState<Row | null>(null),
    [error, setError] = useState("");
  async function load() {
    setOpen(true);
    setError("");
    setQr(null);
    try {
      setQr(await api<Row>(`/api/v1/qr/${kind}/${sourceId}`, { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lấy được mã.");
    }
  }
  return (
    <>
      <Button variant="ghost" type="button" onClick={() => void load()}>
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description="Đưa mã này cho nhân viên Minh An quét và đối chiếu thông tin."
      >
        {error ? (
          <Notice tone="error">
            {error}
            <Button onClick={() => void load()}>Thử lại</Button>
          </Notice>
        ) : qr ? (
          <div className="grid justify-items-center gap-3">
            <Image
              src={value(qr, "image")}
              width={280}
              height={280}
              unoptimized
              alt="QR nghiệp vụ Minh An"
            />
            <code className="break-all text-xs">{value(qr, "payload")}</code>
            <p className="text-sm">Mã tra cứu nghiệp vụ · không dùng để chuyển khoản.</p>
          </div>
        ) : (
          <p>Đang lấy mã…</p>
        )}
      </Dialog>
    </>
  );
}
export function ScanPanel({
  onResolved,
  expected,
}: {
  onResolved: (data: Row) => void;
  expected?: string;
}) {
  const [payload, setPayload] = useState(""),
    [camera, setCamera] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    onRead = useRef<(text: string) => void>(() => {}),
    resolving = useRef(false);
  async function resolve(text: string) {
    if (resolving.current) return;
    resolving.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<Row>("/api/v1/qr/resolve", {
        method: "POST",
        body: JSON.stringify({ payload: text.trim() }),
      });
      if (expected && value(result, "kind") !== expected)
        throw new Error("Mã không đúng loại cần quét.");
      setCamera(false);
      setPayload("");
      onResolved(result);
    } catch (e) {
      setCamera(false);
      setError(e instanceof Error ? e.message : "Không đọc được mã.");
    } finally {
      setBusy(false);
      resolving.current = false;
    }
  }
  useEffect(() => {
    onRead.current = (text) => void resolve(text);
  });
  useEffect(() => {
    if (!camera || !video.current) return;
    let stopped = false;
    let stop: (() => void) | undefined;
    void import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (result) => {
          if (result && !stopped) onRead.current(result.getText());
        });
        if (stopped) controls.stop();
        else stop = () => controls.stop();
      })
      .catch(() => {
        if (!stopped) {
          setError("Không mở được camera. Kiểm tra quyền camera hoặc nhập mã / dùng máy quét USB.");
          setCamera(false);
        }
      });
    return () => {
      stopped = true;
      stop?.();
    };
  }, [camera]);
  return (
    <div className="space-y-3">
      <Form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(payload);
        }}
      >
        <Field label="Mã QR / máy quét USB">
          <TextInput
            autoComplete="off"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Quét hoặc nhập mã Minh An"
            required
            maxLength={200}
          />
        </Field>
        <Button type="submit" busy={busy}>
          Tra cứu mã
        </Button>
        <Button variant="ghost" type="button" onClick={() => setCamera(!camera)}>
          {camera ? "Tắt camera" : "Quét bằng camera"}
        </Button>
      </Form>
      {camera && <video ref={video} className="max-h-72 w-full rounded-lg" muted playsInline />}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
