"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatVnd, formatDateTime } from "@/lib/format";
import { Card, Notice } from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";
type Mismatch = {
  provider_txn_id: string;
  received_amount: string;
  expected_amount: string | null;
  status: string;
  received_at: string;
  invoice_code: string | null;
  reference_code: string | null;
};
export function OnlinePaymentMismatches() {
  const query = useQuery({
    queryKey: ["online-payment-mismatches"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Mismatch[]>("/api/v1/payments/mismatches", { signal }),
    refetchInterval: 15000,
  });
  return (
    <Card className="space-y-3 no-print">
      <h2 className="text-lg font-semibold">Chuyển khoản online cần đối soát</h2>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && <p>Không có giao dịch chưa khớp.</p>}
      {!!query.data?.length && (
        <Notice>
          Chưa ghi phiếu thu cho các giao dịch này. Kiểm tra sao kê, mã ngân hàng và khoản đã thu
          trước khi xử lý tại quầy.
        </Notice>
      )}
      {query.data?.map((row) => (
        <div key={row.provider_txn_id} className="border-t border-line pt-3">
          <p>
            <strong>{row.invoice_code ?? "Chưa xác định hóa đơn"}</strong> ·{" "}
            {row.reference_code ?? "Không tìm thấy mã"}
          </p>
          <p>
            Mã ngân hàng: {row.provider_txn_id} · {formatDateTime(row.received_at)}
          </p>
          <p>
            Đã nhận {formatVnd(row.received_amount)} ·{" "}
            {row.expected_amount
              ? `Hóa đơn ${formatVnd(row.expected_amount)}`
              : "Chờ xác định khoản thu"}
          </p>
        </div>
      ))}
    </Card>
  );
}
