"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mutate, rows, value, number, labels, type Row } from "@/lib/workflow";
import { formatDateTime, formatVnd } from "@/lib/format";
import { Button, Card, Notice, StatusBadge } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";
import { OnlinePaymentModal } from "./online-payment-modal";
export function OnlineMedicationOrder({ encounterId }: { encounterId: number }) {
  const me = useUser(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [invoice, setInvoice] = useState(0),
    [cancelOpen, setCancelOpen] = useState(false);
  const createKey = useRef(crypto.randomUUID());
  const query = useQuery({
    queryKey: ["online-medication-order", encounterId, me.data?.id],
    queryFn: ({ signal }) =>
      api<Row>(`/api/v1/pharmacy/encounters/${encounterId}/online-order`, { signal }),
    enabled: me.data?.roles.includes("PATIENT") === true,
    refetchInterval: 15000,
  });
  const order = query.data?.order as Row | null | undefined,
    allocations = rows(order, "allocations");
  const orderId = number(order, "id"),
    orderStatus = value(order, "status");
  const active = orderStatus === "OPEN";
  useEffect(() => {
    if (orderStatus && orderStatus !== "OPEN") createKey.current = crypto.randomUUID();
  }, [orderId, orderStatus]);
  async function refresh() {
    await query.refetch();
    void cache.invalidateQueries({ queryKey: ["billing"] });
  }
  async function place() {
    setBusy(true);
    setError("");
    try {
      await mutate(
        `/api/v1/pharmacy/prescriptions/${number(query.data, "prescriptionId")}/online-orders`,
        {},
        "POST",
        createKey.current,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đặt được thuốc.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4 no-print">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Đặt thuốc online theo đơn</h2>
          <p className="text-sm text-muted mt-1">
            Thuốc được phân bổ tự động đến các quầy còn hàng và giữ trong 30 phút nếu chưa thanh
            toán. Tiền online vào tài khoản chung của bệnh viện.
          </p>
        </div>
        {number(query.data, "prescriptionId") > 0 && !active && (
          <Button busy={busy} onClick={() => void place()}>
            {order ? "Đặt lại phần thuốc còn lại" : "Đặt thuốc online"}
          </Button>
        )}
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {query.data && !number(query.data, "prescriptionId") && (
        <Notice>Chưa có đơn thuốc đã chốt để đặt online.</Notice>
      )}
      {order && (
        <>
          <div className="at-online-order-summary">
            <div className="flex flex-wrap items-center gap-2">
              <strong>Đơn online #{number(order, "id")}</strong>
              <StatusBadge status={value(order, "status")}>
                {value(order, "status") === "EXPIRED"
                  ? "Đã hết hạn"
                  : (labels[value(order, "status")] ?? value(order, "status"))}
              </StatusBadge>
              {active && allocations.every((a) => number(a, "collected") === 0) && (
                <span className="text-xs text-muted">
                  · Hạn giữ thuốc: {formatDateTime(value(order, "expires_at"))}
                </span>
              )}
            </div>
            <strong className="text-base text-brand">
              Tổng {formatVnd(value(order, "total"))}
            </strong>
          </div>
          {allocations.map((a) => (
            <div key={number(a, "invoiceId")} className="at-online-allocation">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-base">{value(a, "counterName")}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={value(a, "invoiceStatus")}>
                    {labels[value(a, "invoiceStatus")] ?? value(a, "invoiceStatus")}
                  </StatusBadge>
                  <StatusBadge status={value(a, "dispensingStatus")}>
                    {labels[value(a, "dispensingStatus")] ?? value(a, "dispensingStatus")}
                  </StatusBadge>
                </div>
              </div>
              <ul className="at-online-lines">
                {rows(a, "lines").map((line, i) => (
                  <li key={i}>
                    <span>
                      <strong>{value(line, "name")}</strong> · {value(line, "quantity")}{" "}
                      {value(line, "unit")}
                    </span>
                    <strong>{formatVnd(value(line, "amount"))}</strong>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-sm text-muted">
                  Hóa đơn <strong>{value(a, "invoiceCode")}</strong> · Tổng quầy{" "}
                  <strong className="text-ink">{formatVnd(value(a, "total"))}</strong>
                </p>
                {active && ["OPEN", "PARTIAL"].includes(value(a, "invoiceStatus")) && (
                  <Button onClick={() => setInvoice(number(a, "invoiceId"))}>
                    Thanh toán phần thuốc của quầy
                  </Button>
                )}
              </div>
            </div>
          ))}
          {active &&
            allocations.every(
              (a) =>
                number(a, "collected") - number(a, "refunded") <= 0 &&
                value(a, "dispensingStatus") !== "DELIVERED",
            ) && (
              <div>
                <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                  Hủy đơn và nhả tồn giữ
                </Button>
              </div>
            )}
        </>
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn thuốc online chưa thanh toán"
        description="Thuốc đang giữ sẽ được trả lại tồn khả dụng của các quầy."
        actionLabel="Hủy đơn"
        onConfirm={async () => {
          await mutate(`/api/v1/pharmacy/online-orders/${number(order, "id")}/cancel`);
          createKey.current = crypto.randomUUID();
          await refresh();
        }}
      />
      {invoice > 0 && (
        <OnlinePaymentModal
          invoiceId={invoice}
          onClose={() => setInvoice(0)}
          onPaid={() => void refresh()}
        />
      )}
    </Card>
  );
}
