"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import { Button, Notice } from "@/components/ui";
import { Dialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";

export type PaymentIntent = {
  id: number;
  invoiceId: number;
  reference: string;
  amount: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "MISMATCH";
  expiresAt: string;
  receiptId: number | null;
  image: string;
  simulator: boolean;
};
export function OnlinePaymentModal({
  invoiceId,
  onClose,
  onPaid,
}: {
  invoiceId: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const me = useUser();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paidOnce = useRef(false);
  const callback = useRef(onPaid);
  useEffect(() => {
    callback.current = onPaid;
  }, [onPaid]);
  const create = useMutation({
    mutationFn: () =>
      api<PaymentIntent>(`/api/v1/billing/invoices/${invoiceId}/payment-intents`, {
        method: "POST",
      }),
    retry: false,
  });
  const createStarted = useRef(false);
  const { mutate: createIntent } = create;
  useEffect(() => {
    if (createStarted.current) return;
    createStarted.current = true;
    createIntent();
  }, [createIntent]);
  const intent = useQuery({
    queryKey: ["online-payment", me.data?.id, create.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PaymentIntent>(`/api/v1/payment-intents/${create.data!.id}`, { signal }),
    enabled: !!create.data && !create.isPending,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== "PENDING" ? false : 3000,
    retry: false,
  });
  const data = intent.data ?? create.data;
  const remaining = data ? Math.max(0, Math.ceil((Date.parse(data.expiresAt) - now) / 1000)) : 0;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!create.data?.id || typeof EventSource === "undefined") return;
    const source = new EventSource("/api/v1/realtime/stream", { withCredentials: true });
    const listener = () => {
      void intent.refetch();
    };
    source.addEventListener("payment.updated", listener);
    return () => {
      source.removeEventListener("payment.updated", listener);
      source.close();
    };
    // Only replace the connection when the intent changes. Polling remains available on SSE errors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [create.data?.id]);
  useEffect(() => {
    if (data?.status === "PAID" && !paidOnce.current) {
      paidOnce.current = true;
      callback.current();
    }
  }, [data?.status]);
  async function simulate() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/payment-intents/${data.id}/simulate`, { method: "POST" });
      await intent.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không ghi nhận được thanh toán.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Thanh toán bằng QR"
      description="Quét bằng ứng dụng ngân hàng. Giữ nguyên số tiền và nội dung chuyển khoản."
      busy={busy}
    >
      <div className="space-y-4">
        <QueryState
          loading={create.isPending && !data}
          error={create.error}
          retry={() => createIntent()}
        />
        {error && <Notice tone="error">{error}</Notice>}
        {intent.error && (
          <Notice tone="error">
            Không cập nhật được trạng thái.{" "}
            <Button variant="ghost" onClick={() => void intent.refetch()}>
              Thử lại
            </Button>
          </Notice>
        )}
        {data?.status === "PAID" ? (
          <Notice tone="success">Đã thanh toán ✓. Biên lai đã được ghi nhận.</Notice>
        ) : (
          data && (
            <>
              {data.status === "PENDING" && remaining > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.image}
                    width={280}
                    height={280}
                    alt="Mã VietQR thanh toán hóa đơn"
                    className="mx-auto"
                  />
                  <p className="text-center text-xl font-semibold">{formatVnd(data.amount)}</p>
                  <p>
                    Nội dung chuyển khoản: <strong className="select-all">{data.reference}</strong>
                  </p>
                  <p aria-live="polite">
                    Còn {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
                  </p>
                  {data.simulator && (
                    <>
                      <Notice>Chế độ demo: mô phỏng này không chuyển tiền ngân hàng.</Notice>
                      <Button type="button" disabled={busy} onClick={simulate}>
                        Giả lập đã chuyển khoản
                      </Button>
                    </>
                  )}
                </>
              ) : data.status === "MISMATCH" ? (
                <Notice tone="error">
                  Giao dịch chưa khớp hóa đơn. Liên hệ thu ngân để đối soát; chưa có biên lai thanh
                  toán.
                </Notice>
              ) : (
                <Notice>
                  Mã đã hết hạn. Đóng cửa sổ và tạo QR mới. Nếu đã chuyển tiền, liên hệ thu ngân
                  trước khi chuyển lại.
                </Notice>
              )}
            </>
          )
        )}
      </div>
    </Dialog>
  );
}
