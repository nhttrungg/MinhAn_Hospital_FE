"use client";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { value, number, type Row } from "@/lib/workflow";
import { Button, Notice } from "./ui";
import { WorkflowForm } from "./workflow-form";
import { DocumentButton } from "./workflow-tools";
import { QueryState } from "./workspace-ui";
export function WorkflowPayment({
  invoiceId,
  cashier,
  status,
}: {
  invoiceId: number;
  cashier: boolean;
  status: string;
}) {
  const cache = useQueryClient();
  const [qr, setQr] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [refund, setRefund] = useState(false),
    [busy, setBusy] = useState(false);
  const details = useQuery({
    queryKey: ["workflow-invoice", invoiceId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row>(`/api/v1/billing/invoices/${invoiceId}/workflow`, { signal }),
  });
  return (
    <div className="space-y-3">
      <QueryState
        loading={details.isLoading}
        error={details.error}
        retry={() => void details.refetch()}
      />
      {Array.isArray(details.data?.refunds) &&
        details.data.refunds.length > 0 &&
        status !== "VOID" && (
          <Notice>
            Phiếu đang hoàn / hủy. Hoàn phần đã thu còn lại trước khi hủy; không thu tiếp phiếu này.
          </Notice>
        )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="no-print at-ops-actions">
        {cashier &&
          Array.isArray(details.data?.refunds) &&
          details.data.refunds.length === 0 &&
          details.data?.counter_id != null &&
          ["OPEN", "PARTIAL"].includes(status) && (
            <Button
              variant="ghost"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setQr(
                    await api<Row>(`/api/v1/billing/invoices/${invoiceId}/payment-qr`, {
                      method: "POST",
                    }),
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Không tạo được QR.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              QR thanh toán của quầy
            </Button>
          )}
        {cashier &&
          details.data &&
          number(details.data, "paid") > 0 &&
          ["PHARMACY", "DIAGNOSTIC"].includes(value(details.data, "source_type")) &&
          status !== "VOID" && (
            <Button variant="danger" onClick={() => setRefund(true)}>
              Ghi nhận hoàn tiền trước hủy
            </Button>
          )}
      </div>
      {qr &&
        ["OPEN", "PARTIAL"].includes(status) &&
        number(qr, "revision") === number(details.data, "revision") && (
          <div className="at-pay-qr">
            <Image
              unoptimized
              src={value(qr, "image")}
              alt="QR thanh toán ngân hàng của quầy"
              width={250}
              height={250}
            />
            <p>
              <strong>{value(qr, "counterName")}</strong> · {value(qr, "accountName")}
            </p>
            <p>
              {value(qr, "accountNo")} · {value(qr, "amount")} VND · {value(qr, "reference")}
            </p>
            <p className="text-sm">
              Thu ngân đối soát tiền về trước khi xác nhận. Quét QR chưa ghi nhận đã trả.
            </p>
          </div>
        )}
      {refund && details.data && (
        <WorkflowForm
          title="Ghi nhận tiền đã hoàn thực tế"
          path={`/api/v1/billing/invoices/${invoiceId}/refunds`}
          base={{ revision: details.data.revision }}
          fields={[
            { key: "amount", label: "Số tiền hoàn VND", type: "number" },
            {
              key: "method",
              label: "Hình thức",
              options: [
                { value: "CASH", label: "Tiền mặt" },
                { value: "TRANSFER", label: "Chuyển khoản" },
              ],
            },
            {
              key: "transactionReference",
              label: "Mã giao dịch hoàn (bắt buộc khi chuyển khoản)",
              required: false,
            },
            { key: "reason", label: "Lý do", type: "textarea" },
          ]}
          onClose={() => setRefund(false)}
          onDone={() => {
            void cache.invalidateQueries({ queryKey: ["invoice", invoiceId] });
            void cache.invalidateQueries({ queryKey: ["billing"] });
            void details.refetch();
            setQr(null);
          }}
        />
      )}
      {Array.isArray(details.data?.refunds) &&
        (details.data.refunds as Row[]).map((r) => (
          <p key={number(r, "id")} className="text-sm">
            Hoàn {value(r, "amount")} VND · {value(r, "reason")}
          </p>
        ))}
    </div>
  );
}
export function ReceiptDocument({ id }: { id: number }) {
  return <DocumentButton type="RECEIPT" sourceId={id} label="PDF biên lai" />;
}
