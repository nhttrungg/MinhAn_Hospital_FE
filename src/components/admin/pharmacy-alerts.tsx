"use client";
import { Card, Notice } from "@/components/ui";
import { formatQuantity } from "@/lib/format";
export type AlertBatch = {
  id: number;
  counterId: number;
  medicationId: number;
  name: string;
  unit: string;
  batchCode: string;
  expiryDate: string;
  quantity: number | string;
  available: number | string;
};
export type StockAlert = {
  medicationId: number;
  counterId: number;
  name: string;
  unit: string;
  available: number | string;
  reorderLevel: number;
};
export type PharmacyAlertsData = {
  expired: AlertBatch[];
  nearExpiry: AlertBatch[];
  lowStock: StockAlert[];
  total: number;
  asOf: string;
  nearExpiryDays: number;
};
export function PharmacyAlerts({ data }: { data: PharmacyAlertsData }) {
  return (
    <div className="space-y-4">
      <Notice tone={data.total ? "warning" : "success"}>
        {data.total ? `${data.total} cảnh báo cần đối chiếu kho.` : "Không có cảnh báo kho."} Tính
        đến {data.asOf}, ngưỡng sắp hết hạn {data.nearExpiryDays} ngày. Tồn khả dụng đã trừ giữ chỗ
        và loại lô hết hạn/ngưng cấp.
      </Notice>
      {(
        [
          ["expired", "Lô hết hạn", data.expired],
          ["nearExpiry", "Lô sắp hết hạn", data.nearExpiry],
        ] as const
      ).map(([key, label, batches]) => (
        <Card key={key} className="space-y-2">
          <h2 className="font-semibold">
            {label} ({batches.length})
          </h2>
          {batches.map((b) => (
            <p key={`${b.counterId}-${b.id}`} className="text-sm">
              <strong>{b.name}</strong> · Lô {b.batchCode} · hạn {b.expiryDate} · còn{" "}
              {formatQuantity(String(b.quantity))} {b.unit}
            </p>
          ))}
          {!batches.length && <p className="text-sm text-muted">Không có lô trong nhóm này.</p>}
        </Card>
      ))}
      <Card className="space-y-2">
        <h2 className="font-semibold">Tồn dưới mức tối thiểu ({data.lowStock.length})</h2>
        {data.lowStock.map((m) => (
          <p key={`${m.counterId}-${m.medicationId}`} className="text-sm">
            <strong>{m.name}</strong> · khả dụng {formatQuantity(String(m.available))} {m.unit} ·
            mức tối thiểu {m.reorderLevel}
          </p>
        ))}
        {!data.lowStock.length && <p className="text-sm text-muted">Không có thuốc dưới ngưỡng.</p>}
      </Card>
    </div>
  );
}
