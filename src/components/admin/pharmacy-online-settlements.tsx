"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { rows, value, number, type Row } from "@/lib/workflow";
import { formatDateTime, formatVnd } from "@/lib/format";
import { Button, Card, Notice } from "@/components/ui";
import { DataTable } from "@/components/ui/data-display";
import { QueryState, useUser } from "@/components/workspace-ui";
import { WorkflowForm } from "@/components/workflow-form";
export function PharmacyOnlineSettlements({ counterId }: { counterId: number }) {
  const me = useUser(),
    [recording, setRecording] = useState(false);
  const query = useQuery({
    queryKey: ["pharmacy-online-settlements", counterId, me.data?.id],
    queryFn: ({ signal }) =>
      api<Row>(`/api/v1/pharmacy/counters/${counterId}/online-settlements`, { signal }),
    enabled: counterId > 0,
    refetchInterval: 15000,
  });
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Tiền thuốc online bệnh viện thu hộ quầy</h2>
      <p>
        Chỉ tính khoản online đã xác nhận vào tài khoản chung. Tiền khách trả trực tiếp tại quầy
        được theo dõi riêng.
      </p>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["collected", "Bệnh viện đã thu hộ"],
              ["refunded", "Đã hoàn khách"],
              ["transferred", "Đã chuyển trả quầy"],
              ["outstanding", "Quầy chưa nhận"],
            ].map(([key, label]) => (
              <Card key={key}>
                <p>{label}</p>
                <p className="text-xl font-semibold">{formatVnd(value(query.data, key))}</p>
              </Card>
            ))}
          </div>
          {number(query.data, "recoverable") > 0 && (
            <Notice tone="error">
              Sau hoàn tiền, quầy cần đối soát trả lại {formatVnd(value(query.data, "recoverable"))}{" "}
              cho bệnh viện.
            </Notice>
          )}
          {me.data?.roles.includes("ADMIN") && (
            <Button
              disabled={number(query.data, "outstanding") <= 0}
              onClick={() => setRecording(true)}
            >
              Ghi nhận đã chuyển trả quầy
            </Button>
          )}
          <h3 className="font-semibold">Hóa đơn online của quầy</h3>
          <DataTable
            data={rows(query.data, "invoices")}
            columns={[
              { header: "Hóa đơn", accessorKey: "invoiceCode" },
              {
                header: "Đã thu hộ",
                cell: ({ row }) => formatVnd(value(row.original, "collected")),
              },
              { header: "Đã hoàn", cell: ({ row }) => formatVnd(value(row.original, "refunded")) },
            ]}
          />
          <h3 className="font-semibold">Lịch sử chuyển trả</h3>
          <DataTable
            data={rows(query.data, "settlements")}
            columns={[
              {
                header: "Ngày ghi nhận",
                cell: ({ row }) => formatDateTime(value(row.original, "recordedAt")),
              },
              { header: "Số tiền", cell: ({ row }) => formatVnd(value(row.original, "amount")) },
              { header: "Mã giao dịch", accessorKey: "transactionReference" },
              { header: "Ghi chú", accessorKey: "note" },
            ]}
          />
        </>
      )}
      {recording && (
        <WorkflowForm
          title="Ghi nhận khoản đã chuyển trả vào tài khoản riêng của quầy"
          path={`/api/v1/pharmacy/counters/${counterId}/online-settlements`}
          fields={[
            { key: "amount", label: "Số tiền đã chuyển trả VND", type: "number" },
            { key: "transactionReference", label: "Mã giao dịch chuyển khoản thực tế" },
            { key: "note", label: "Nội dung đối soát", type: "textarea" },
          ]}
          onClose={() => setRecording(false)}
          onDone={() => {
            setRecording(false);
            void query.refetch();
          }}
        />
      )}
    </div>
  );
}
