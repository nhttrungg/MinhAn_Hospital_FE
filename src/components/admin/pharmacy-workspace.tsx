"use client";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Disclosure } from "@/components/ui/disclosure";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { api, allOptions } from "@/lib/api";
import { mutate, rows, value, number, labels, type Row } from "@/lib/workflow";
import { formatVnd } from "@/lib/format";
import {
  Button,
  Card,
  Field,
  Notice,
  SelectInput,
  TextInput,
  TextArea,
  Form,
  Checkbox,
  StatusBadge,
} from "@/components/ui";
import { PageHeader, DataTable } from "@/components/ui/data-display";
import { Dialog, DialogClose, ConfirmDialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";
import { DocumentButton, ScanPanel, QrButton } from "@/components/workflow-tools";
import { WorkflowForm, type FormField } from "@/components/workflow-form";
import { PharmacyOnlineSettlements } from "./pharmacy-online-settlements";
import { PharmacyAlerts, type PharmacyAlertsData } from "./pharmacy-alerts";

type FormSpec = {
  title: string;
  path: string;
  method?: string;
  fields: FormField[];
  base?: Row;
  initial?: Row;
  staff?: Row[];
};
export function PharmacyWorkspace() {
  const me = useUser(),
    admin = me.data?.roles.includes("ADMIN"),
    pharmacist = me.data?.roles.includes("PHARMACIST"),
    cache = useQueryClient();
  const [counter, setCounter] = useState(""),
    [tab, setTab] = useState("orders"),
    [form, setForm] = useState<FormSpec | null>(null),
    [prescription, setPrescription] = useState<Row | null>(null),
    [editingDraft, setEditingDraft] = useState<Row | null>(null),
    [dispensing, setDispensing] = useState<Row | null>(null),
    [trace, setTrace] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<{ id: number; revision: number; action: string } | null>(null);
  const counters = useQuery({
    queryKey: ["pharmacy-counters", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>("/api/v1/pharmacy/counters", { signal }),
  });
  const cid = Number(counter || counters.data?.[0]?.id || 0);
  const destinations = useQuery({
    queryKey: ["pharmacy-destinations", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>("/api/v1/pharmacy/counter-destinations", { signal }),
    enabled: !!admin || !!pharmacist,
  });
  const stock = useQuery({
    queryKey: ["pharmacy-stock", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>(`/api/v1/pharmacy/counters/${cid}/stock`, { signal }),
    enabled: cid > 0,
  });
  const alerts = useQuery({
    queryKey: ["pharmacy-alerts", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PharmacyAlertsData>(`/api/v1/pharmacy/alerts?counterId=${cid}`, { signal }),
    enabled: cid > 0 && (!!admin || !!pharmacist),
    refetchInterval: 30000,
  });
  const orders = useQuery({
    queryKey: ["pharmacy-orders", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>(`/api/v1/pharmacy/counters/${cid}/orders`, { signal }),
    enabled: cid > 0,
    refetchInterval: 15000,
  });
  const dispensings = useQuery({
    queryKey: ["pharmacy-dispensings", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>(`/api/v1/pharmacy/counters/${cid}/dispensings`, { signal }),
    enabled: cid > 0,
    refetchInterval: 15000,
  });
  const movements = useQuery({
    queryKey: ["pharmacy-movements", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>(`/api/v1/pharmacy/counters/${cid}/movements`, { signal }),
    enabled: cid > 0 && tab === "movements",
  });
  const report = useQuery({
    queryKey: ["pharmacy-report", cid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row>(`/api/v1/pharmacy/counters/${cid}/report`, { signal }),
    enabled: cid > 0 && tab === "report",
  });
  const meds = useQuery({
    queryKey: ["workflow-meds"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>("/api/v1/pharmacy/medications", { signal }),
    enabled: !!admin || !!pharmacist,
  });
  const staff = useQuery({
    queryKey: ["workflow-staff"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Row>("/api/v1/staff-accounts", { signal }),
    enabled: !!admin,
  });
  const rooms = useQuery({
    queryKey: ["workflow-rooms"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Row>("/api/v1/catalog/rooms?active=true", { signal }),
    enabled: !!admin,
  });
  function refresh() {
    void cache.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith("pharmacy"),
    });
    if (prescription) {
      const id = prescription.id;
      void api<Row>(`/api/v1/pharmacy/prescriptions/${id}`)
        .then((p) => setPrescription((current) => (current?.id === id ? p : current)))
        .catch(() => {});
    }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }
  const medOptions =
    meds.data?.map((m) => ({
      value: number(m, "id"),
      label: `${value(m, "name")} ${value(m, "strength")} · ${value(m, "unit")}`,
    })) ?? [];
  const counterOptions =
    counters.data
      ?.filter((c) => number(c, "id") !== cid)
      .map((c) => ({ value: number(c, "id"), label: value(c, "name") })) ?? [];
  const destinationOptions =
    destinations.data
      ?.filter((c) => number(c, "id") !== cid)
      .map((c) => ({ value: number(c, "id"), label: value(c, "name") })) ?? [];
  function counterForm(c?: Row) {
    setForm({
      title: c ? "Sửa quầy và phân công" : "Tạo quầy thuốc",
      path: `/api/v1/pharmacy/counters${c ? "/" + c.id : ""}`,
      method: c ? "PUT" : "POST",
      base: c ? { revision: c.revision, active: true } : {},
      initial: c
        ? {
            ...c,
            roomId: c.room_id,
            bankBin: c.bank_bin,
            accountNo: c.account_no,
            accountName: c.account_name,
            staff: rows(c, "staff").map((s) => ({ staffId: s.id })),
          }
        : {},
      staff:
        staff.data
          ?.filter(
            (s) =>
              Array.isArray(s.roles) &&
              s.roles.some((r) => ["PHARMACIST", "CASHIER"].includes(String(r))) &&
              s.active === true &&
              s.accountStatus === "ACTIVE",
          )
          .map((s) => ({ ...s, role: (s.roles as string[]).join(", ") })) ?? [],
      fields: [
        ...(!c ? [{ key: "code", label: "Mã quầy" }] : []),
        { key: "name", label: "Tên quầy" },
        {
          key: "roomId",
          label: "Phòng quầy thuốc",
          options:
            rooms.data
              ?.filter((r) => value(r, "roomType") === "PHARMACY")
              .map((r) => ({ value: number(r, "id"), label: value(r, "name") })) ?? [],
        },
        { key: "bankBin", label: "Mã BIN ngân hàng (6 số)", required: false },
        { key: "accountNo", label: "Số tài khoản", required: false },
        { key: "accountName", label: "Chủ tài khoản (không dấu)", required: false },
      ],
    });
  }
  const orderColumns: ColumnDef<Row>[] = [
    { header: "Bệnh nhân", accessorKey: "patient_name" },
    {
      header: "Đơn / phiên bản",
      cell: ({ row }) => `DT${row.original.prescription_id} · v${row.original.version}`,
    },
    {
      header: "Trạng thái",
      cell: ({ row }) => (
        <StatusBadge status={value(row.original, "status")}>
          {labels[value(row.original, "status")]}
        </StatusBadge>
      ),
    },
    {
      header: "Thao tác",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void run(async () => {
                setEditingDraft(null);
                setPrescription(
                  await api<Row>(`/api/v1/pharmacy/prescriptions/${row.original.prescription_id}`),
                );
              })
            }
          >
            Đối chiếu đơn
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void run(async () =>
                setTrace(
                  await api<Row>(
                    `/api/v1/pharmacy/counters/${cid}/orders/${row.original.encounter_id}/trace`,
                  ),
                ),
              )
            }
          >
            Lịch sử đối chiếu
          </Button>
          {pharmacist && value(row.original, "status") === "OPEN" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    title: "Đóng phần thiếu của đơn",
                    path: `/api/v1/pharmacy/counters/${cid}/orders/${row.original.encounter_id}/close`,
                    base: { revision: row.original.revision },
                    fields: [{ key: "reason", label: "Lý do đóng phần thiếu", type: "textarea" }],
                  })
                }
              >
                Đóng thiếu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    title: "Chuyển toàn bộ đơn sang quầy khác",
                    path: `/api/v1/pharmacy/counters/${cid}/orders/${row.original.encounter_id}/transfer`,
                    base: { revision: row.original.revision },
                    fields: [
                      {
                        key: "destinationCounterId",
                        label: "Quầy nhận",
                        options: destinationOptions,
                      },
                      { key: "reason", label: "Lý do", type: "textarea" },
                    ],
                  })
                }
              >
                Đổi quầy
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  const stockColumns: ColumnDef<Row>[] = [
    {
      header: "Thuốc / lô",
      cell: ({ row }) => (
        <>
          {value(row.original, "name")} {value(row.original, "strength")}
          <small>
            {value(row.original, "batch_code")} · {value(row.original, "expiry_date")}
          </small>
        </>
      ),
    },
    {
      header: "Tồn / giữ / khả dụng",
      cell: ({ row }) =>
        `${row.original.quantity} / ${row.original.reserved} / ${row.original.available} ${row.original.unit}`,
    },
    { header: "Giá", cell: ({ row }) => formatVnd(value(row.original, "price") || "0") },
    {
      header: "Thao tác",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <QrButton kind="BATCH" sourceId={number(row.original, "id")} label="QR lô" />
          {(admin || pharmacist) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    title: "Kiểm kê / điều chỉnh tồn",
                    path: `/api/v1/pharmacy/counters/${cid}/stock/adjust`,
                    base: { batchId: row.original.id, revision: row.original.revision },
                    fields: [
                      { key: "quantity", label: "Tồn thực tế sau kiểm kê", type: "number" },
                      { key: "reason", label: "Lý do", type: "textarea" },
                    ],
                  })
                }
              >
                Kiểm kê
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    title: "Chuyển thuốc giữa quầy",
                    path: `/api/v1/pharmacy/counters/${cid}/stock/transfer`,
                    base: { batchId: row.original.id, revision: row.original.revision },
                    fields: [
                      { key: "destinationCounterId", label: "Quầy nhận", options: counterOptions },
                      { key: "quantity", label: "Số lượng", type: "number" },
                      { key: "reason", label: "Lý do", type: "textarea" },
                    ],
                  })
                }
              >
                Chuyển
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm({
                    title: "Thay đổi trạng thái lô",
                    path: `/api/v1/pharmacy/counters/${cid}/stock/status`,
                    base: {
                      batchId: row.original.id,
                      revision: row.original.revision,
                      quantity: row.original.quantity,
                      active: !number(row.original, "active"),
                    },
                    fields: [{ key: "reason", label: "Lý do", type: "textarea" }],
                  })
                }
              >
                {number(row.original, "active") ? "Ngừng lô" : "Mở lô"}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  const dispensingColumns: ColumnDef<Row>[] = [
    {
      header: "Phiếu / bệnh nhân",
      cell: ({ row }) =>
        `CP${row.original.id} · ${row.original.patient_name}${row.original.online_order_id ? " · Đặt online" : ""}`,
    },
    {
      header: "Trạng thái",
      cell: ({ row }) => (
        <StatusBadge status={value(row.original, "status")}>
          {labels[value(row.original, "status")]}
        </StatusBadge>
      ),
    },
    {
      header: "Thanh toán",
      cell: ({ row }) => (
        <StatusBadge status={value(row.original, "invoice_status") || "DRAFT"}>
          {labels[value(row.original, "invoice_status")] ?? "Chưa chốt"}
        </StatusBadge>
      ),
    },
    {
      header: "Thao tác",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void run(async () =>
                setDispensing(await api<Row>(`/api/v1/pharmacy/dispensings/${row.original.id}`)),
              )
            }
          >
            Xem
          </Button>
          {pharmacist &&
            row.original.online_order_id != null &&
            number(row.original, "unchecked_lines") > 0 &&
            value(row.original, "status") === "READY" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirm({
                    id: number(row.original, "id"),
                    revision: number(row.original, "revision"),
                    action: "verify-online",
                  })
                }
              >
                Xác nhận kiểm thuốc online
              </Button>
            )}
          {pharmacist && ["DRAFT", "READY"].includes(value(row.original, "status")) && (
            <>
              {value(row.original, "status") === "DRAFT" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void run(async () => {
                      const d = await api<Row>(`/api/v1/pharmacy/dispensings/${row.original.id}`);
                      const p = await api<Row>(
                        `/api/v1/pharmacy/prescriptions/${d.prescription_id}`,
                      );
                      setEditingDraft(d);
                      setPrescription(p);
                    })
                  }
                >
                  Sửa soạn
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirm({
                    id: number(row.original, "id"),
                    revision: number(row.original, "revision"),
                    action: value(row.original, "status") === "DRAFT" ? "commit" : "deliver",
                  })
                }
              >
                {value(row.original, "status") === "DRAFT" ? "Chốt soạn" : "Giao thuốc"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirm({
                    id: number(row.original, "id"),
                    revision: number(row.original, "revision"),
                    action: "cancel",
                  })
                }
              >
                Hủy phiếu
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  return (
    <section className="space-y-5">
      <PageHeader
        title="Quầy thuốc và cấp phát"
        eyebrow="Dược"
        description="Nhận đơn đã chốt, soạn đúng lô, thu đủ tiền thuốc rồi mới giao. Nhập kho và kiểm kê là việc kho, không thay cho cấp phát."
      />
      <QueryState
        loading={counters.isLoading}
        error={counters.error}
        retry={() => void counters.refetch()}
      />
      {message && <Notice tone="error">{message}</Notice>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Quầy đang làm">
          <SelectInput
            value={cid || ""}
            onChange={(e) => {
              setCounter(e.target.value);
              setPrescription(null);
              setEditingDraft(null);
              setDispensing(null);
            }}
          >
            {counters.data?.map((c) => (
              <option key={number(c, "id")} value={number(c, "id")}>
                {value(c, "name")}
              </option>
            ))}
          </SelectInput>
        </Field>
        {admin && (
          <>
            <Button disabled={staff.isLoading || rooms.isLoading} onClick={() => counterForm()}>
              Tạo quầy
            </Button>
            {cid > 0 && (
              <Button
                disabled={staff.isLoading || rooms.isLoading}
                variant="ghost"
                onClick={() =>
                  void run(async () =>
                    counterForm(await api<Row>(`/api/v1/pharmacy/counters/${cid}`)),
                  )
                }
              >
                Cấu hình quầy / phân công
              </Button>
            )}
          </>
        )}
        {(pharmacist || admin) && cid > 0 && (
          <Button
            variant="ghost"
            disabled={meds.isLoading}
            onClick={() =>
              setForm({
                title: "Nhập thuốc vào quầy",
                path: `/api/v1/pharmacy/counters/${cid}/stock/receive`,
                fields: [
                  { key: "medicationId", label: "Thuốc", options: medOptions },
                  { key: "batchCode", label: "Mã lô" },
                  { key: "expiryDate", label: "Hạn dùng", type: "date" },
                  { key: "quantity", label: "Số lượng nhập", type: "number" },
                  { key: "reason", label: "Nguồn nhập / lý do", type: "textarea" },
                ],
              })
            }
          >
            Nhập kho
          </Button>
        )}
        {admin && cid > 0 && (
          <Button
            disabled={meds.isLoading}
            onClick={() =>
              setForm({
                title: "Đặt giá thuốc tại quầy",
                path: `/api/v1/pharmacy/counters/${cid}/prices`,
                fields: [
                  { key: "medicationId", label: "Thuốc", options: medOptions },
                  { key: "price", label: "Đơn giá VND", type: "number" },
                ],
              })
            }
          >
            Giá thuốc
          </Button>
        )}
      </div>
      {pharmacist && cid > 0 && (
        <ScanPanel
          expected="PRESCRIPTION"
          onResolved={(r) => {
            setEditingDraft(null);
            setPrescription(r.data as Row);
          }}
        />
      )}
      <p className="text-sm text-muted">
        Cấp phát đi từ đơn đang xử lý sang phiếu soạn. Tồn và sổ kho dùng khi nhập hoặc kiểm kê.
        Đóng thiếu và chuyển quầy chỉ khi quầy này không cấp đủ.
      </p>
      <div className="at-tabs" aria-label="Các phân hệ quầy thuốc">
        {[
          ["orders", "Đơn đang xử lý"],
          ["dispensings", "Phiếu soạn / cấp"],
          ["online-orders", "Đơn đặt online"],
          ["stock", "Tồn theo lô"],
          ...(admin || pharmacist ? [["alerts", `Cảnh báo (${alerts.data?.total ?? "…"})`]] : []),
          ["movements", "Sổ nhập / xuất"],
          ["report", "Báo cáo quầy"],
          ["online-money", "Tiền online chưa nhận"],
        ].map(([id, name]) => {
          const active = tab === id;
          return (
            <Button
              appearance="custom"
              key={id}
              type="button"
              data-state={active ? "active" : "inactive"}
              onClick={() => setTab(id)}
            >
              {name}
            </Button>
          );
        })}
      </div>
      {tab === "online-money" && <PharmacyOnlineSettlements key={cid} counterId={cid} />}
      {tab === "orders" && (
        <>
          <QueryState loading={orders.isLoading} error={orders.error} />
          {orders.data && (
            <DataTable
              className="at-catalog-table"
              fitColumns
              data={orders.data}
              columns={orderColumns}
            />
          )}
        </>
      )}
      {tab === "alerts" && (admin || pharmacist) && (
        <>
          <QueryState
            loading={alerts.isLoading}
            error={alerts.error}
            retry={() => void alerts.refetch()}
          />
          {alerts.data && <PharmacyAlerts data={alerts.data} />}
        </>
      )}
      {tab === "dispensings" && (
        <>
          <QueryState loading={dispensings.isLoading} error={dispensings.error} />
          {dispensings.data && (
            <DataTable
              className="at-catalog-table"
              fitColumns
              data={dispensings.data}
              columns={dispensingColumns}
            />
          )}
        </>
      )}
      {tab === "online-orders" && (
        <>
          <Notice>
            Đơn online đã tự phân bổ và giữ tồn tại quầy này. Kiểm thuốc trước khi giao; tiền được
            bệnh viện thu hộ.
          </Notice>
          <QueryState loading={dispensings.isLoading} error={dispensings.error} />
          <DataTable
            className="at-catalog-table"
            fitColumns
            data={(dispensings.data ?? []).filter((d) => d.online_order_id != null)}
            columns={dispensingColumns}
          />
        </>
      )}
      {tab === "stock" && (
        <>
          <QueryState loading={stock.isLoading} error={stock.error} />
          {stock.data && (
            <DataTable
              className="at-catalog-table"
              fitColumns
              data={stock.data}
              columns={stockColumns}
            />
          )}
        </>
      )}
      {tab === "movements" && (
        <>
          <QueryState loading={movements.isLoading} error={movements.error} />
          <DataTable
            data={movements.data ?? []}
            columns={[
              {
                header: "Thuốc / lô",
                cell: ({ row }) => `${row.original.name} · ${row.original.batch_code}`,
              },
              { header: "Thao tác", accessorKey: "action" },
              { header: "Nhập/xuất", accessorKey: "quantity_delta" },
              { header: "Giữ/nhả", accessorKey: "reserved_delta" },
              { header: "Tồn sau", accessorKey: "quantity_after" },
              { header: "Lý do", accessorKey: "reason" },
            ]}
          />
        </>
      )}
      {tab === "report" && (
        <>
          <QueryState loading={report.isLoading} error={report.error} />
          <DataTable
            data={rows(report.data, "invoices")}
            columns={[
              { header: "Hóa đơn", accessorKey: "invoice_code" },
              { header: "Trạng thái", cell: ({ row }) => labels[value(row.original, "status")] },
              { header: "Thực thu", accessorKey: "collected" },
              { header: "Đã hoàn", accessorKey: "refunded" },
            ]}
          />
        </>
      )}
      {form && <WorkflowForm {...form} onClose={() => setForm(null)} onDone={refresh} />}
      {prescription && (
        <PickingModal
          key={`${prescription.id}:${cid}:${editingDraft?.id ?? "new"}`}
          draft={editingDraft}
          prescription={prescription}
          stock={stock.data ?? []}
          counterId={cid}
          pharmacist={!!pharmacist}
          onClose={() => {
            setPrescription(null);
            setEditingDraft(null);
          }}
          onDone={refresh}
        />
      )}
      <Dialog
        open={!!dispensing}
        onOpenChange={(open) => {
          if (!open) setDispensing(null);
        }}
        size="wide"
        title="Chi tiết phiếu soạn / cấp thuốc"
      >
        {dispensing && (
          <div className="space-y-4">
            <p>
              {value(dispensing, "patient_name")} · {labels[value(dispensing, "status")]}
            </p>
            <DataTable
              data={rows(dispensing, "lines")}
              columns={[
                { header: "Thuốc", accessorKey: "name" },
                { header: "Lô", accessorKey: "batch_code" },
                { header: "Hạn dùng", accessorKey: "expiry_date" },
                { header: "Số lượng", accessorKey: "quantity" },
                { header: "Đơn giá", accessorKey: "unit_price" },
              ]}
            />
            {["READY", "DELIVERED"].includes(value(dispensing, "status")) && (
              <DocumentButton
                type="PICKING_TICKET"
                sourceId={number(dispensing, "id")}
                label="In phiếu soạn"
              />
            )}
            {value(dispensing, "status") === "DELIVERED" && (
              <DocumentButton
                type="DISPENSING_TICKET"
                sourceId={number(dispensing, "id")}
                label="In phiếu cấp thuốc"
              />
            )}
          </div>
        )}
      </Dialog>
      <Dialog
        open={!!trace}
        onOpenChange={(open) => {
          if (!open) setTrace(null);
        }}
        title="Lịch sử đối chiếu và cấp thuốc"
        size="wide"
      >
        <DataTable
          data={rows(trace, "lines")}
          columns={[
            { header: "Phiên bản", accessorKey: "version" },
            { header: "Thuốc", accessorKey: "name" },
            { header: "Số kê", accessorKey: "prescribed" },
            { header: "Thực nhặt", accessorKey: "picked" },
            { header: "Lô", accessorKey: "batch_code" },
            { header: "Hạn dùng", accessorKey: "expiry_date" },
            { header: "Phiếu", accessorKey: "dispensing_id" },
            { header: "Trạng thái", cell: ({ row }) => labels[value(row.original, "status")] },
            { header: "Hóa đơn", accessorKey: "invoice_code" },
            {
              header: "Thu / hoàn",
              cell: ({ row }) =>
                `${value(row.original, "collected")} / ${value(row.original, "refunded")}`,
            },
          ]}
        />
        <DataTable
          data={rows(trace, "events")}
          columns={[
            { header: "Thao tác", accessorKey: "action" },
            { header: "Người thực hiện", accessorKey: "actor_name" },
            { header: "Thời điểm", accessorKey: "occurred_at" },
            {
              header: "Chi tiết",
              cell: ({ row }) => (
                <Disclosure title={<>Xem dữ liệu</>}>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {value(row.original, "details")}
                  </pre>
                </Disclosure>
              ),
            },
          ]}
        />
        <DataTable
          data={rows(trace, "movements")}
          columns={[
            { header: "Lô", accessorKey: "batch_id" },
            { header: "Phiếu", accessorKey: "dispensing_id" },
            { header: "Nhập/xuất", accessorKey: "quantity_delta" },
            { header: "Giữ/nhả", accessorKey: "reserved_delta" },
            { header: "Tồn sau", accessorKey: "quantity_after" },
          ]}
        />
      </Dialog>
      <ConfirmDialog
        key={confirm ? `${confirm.id}:${confirm.action}` : "none"}
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm?.action === "verify-online"
            ? "Xác nhận đã kiểm đúng thuốc, lô và số lượng đơn online"
            : confirm?.action === "deliver"
              ? "Xác nhận giao thuốc"
              : confirm?.action === "cancel"
                ? "Hủy phiếu soạn"
                : "Chốt soạn và giữ tồn"
        }
        description="Kiểm tra bệnh nhân, thuốc, lô và số lượng trước khi xác nhận."
        actionLabel="Xác nhận"
        reason={confirm?.action === "cancel"}
        onConfirm={async (reason) => {
          if (!confirm) return;
          if (confirm.action === "verify-online") {
            await mutate(`/api/v1/pharmacy/online-dispensings/${confirm.id}/verify`);
            refresh();
            return;
          }
          await mutate(`/api/v1/pharmacy/dispensings/${confirm.id}/${confirm.action}`, {
            revision: confirm.revision,
            reason,
          });
          refresh();
        }}
      />
      {busy && <p>Đang xử lý…</p>}
    </section>
  );
}

function PickingModal({
  prescription: p,
  draft,
  stock,
  counterId,
  pharmacist,
  onClose,
  onDone,
}: {
  prescription: Row;
  draft: Row | null;
  stock: Row[];
  counterId: number;
  pharmacist: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const items = rows(p, "lines"),
    order = rows(p, "order")[0],
    claimed = number(order, "counter_id") === counterId && value(order, "status") === "OPEN";
  const blank = (l: Row): Row => ({
    prescriptionLineId: l.id,
    batchId: "",
    quantity: "",
    checked: false,
  });
  const [input, setInput] = useState<Row[]>(
    items.flatMap((l) => {
      const saved = rows(draft, "lines").filter(
        (d) => number(d, "prescription_line_id") === number(l, "id"),
      );
      return saved.length
        ? saved.map((d) => ({
            prescriptionLineId: l.id,
            batchId: d.batch_id,
            quantity: d.quantity,
            checked: !!number(d, "checked"),
          }))
        : [blank(l)];
    }),
  );
  const [draftTarget, setDraftTarget] = useState(draft),
    [reason, setReason] = useState(value(draft, "shortage_reason")),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState<Row | null>(null),
    [isClaimed, setClaimed] = useState(claimed),
    [key, setKey] = useState(() => crypto.randomUUID());
  const editable = pharmacist && isClaimed && !created && p.latest === true,
    dirty = input.some((l) => value(l, "quantity") || l.checked) || !!reason;
  function update(index: number, field: string, val: unknown) {
    setInput((prev) =>
      prev.map((l, i) =>
        i === index
          ? { ...l, [field]: val, ...(field === "batchId" ? { checked: false } : {}) }
          : l,
      ),
    );
    setKey(crypto.randomUUID());
  }
  function total(lineId: number) {
    return input
      .filter((l) => number(l, "prescriptionLineId") === lineId)
      .reduce((sum, l) => sum + number(l, "quantity"), 0);
  }
  function remaining(l: Row) {
    return Math.max(0, number(l, "quantity") - number(l, "delivered") - number(l, "reserved"));
  }
  async function claim() {
    setBusy(true);
    setError("");
    try {
      await mutate(`/api/v1/pharmacy/counters/${counterId}/claim/${p.id}`);
      setClaimed(true);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không nhận được đơn.");
    } finally {
      setBusy(false);
    }
  }
  function scanned(result: Row) {
    const batch = result.data as Row,
      l = items.find((l) => number(l, "medication_id") === number(batch, "medication_id"));
    if (number(batch, "counter_id") !== counterId || !l) {
      setError("Lô không thuộc thuốc trong đơn tại quầy này.");
      return;
    }
    const current = stock.find((b) => number(b, "id") === number(batch, "id"));
    if (
      !current ||
      !number(current, "active") ||
      number(current, "available") <= 0 ||
      value(current, "expiry_date") <=
        new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    ) {
      setError("Lô không còn khả dụng.");
      return;
    }
    if (
      input.some(
        (i) =>
          number(i, "prescriptionLineId") === number(l, "id") &&
          number(i, "batchId") === number(batch, "id"),
      )
    ) {
      setError("Lô đã được chọn. Kiểm thuốc và nhập số thực nhặt tại dòng tương ứng.");
      return;
    }
    const empty = input.findIndex(
      (i) => number(i, "prescriptionLineId") === number(l, "id") && !value(i, "batchId"),
    );
    setInput((prev) =>
      empty >= 0
        ? prev.map((i, index) =>
            index === empty ? { ...i, batchId: batch.id, checked: false } : i,
          )
        : [...prev, { ...blank(l), batchId: batch.id }],
    );
    setKey(crypto.randomUUID());
    setError("");
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={draftTarget ? "Sửa phiếu soạn nháp" : "Đối chiếu và soạn thuốc"}
      description={`${value(p, "patient_name")} · DT${p.id} · phiên bản ${p.version}`}
      size="wide"
      busy={busy}
      dirty={dirty && !created}
      footer={
        <>
          <DialogClose>
            <Button variant="ghost" disabled={busy}>
              Đóng
            </Button>
          </DialogClose>
          {pharmacist && !isClaimed && p.latest === true && (
            <Button busy={busy} onClick={() => void claim()}>
              Nhận đơn tại quầy
            </Button>
          )}
          {editable && (
            <Button type="submit" form="picking-form" busy={busy}>
              Lưu phiếu soạn nháp
            </Button>
          )}
        </>
      }
    >
      {error && <Notice tone="error">{error}</Notice>}
      {p.latest !== true && <Notice>Đơn đã có phiên bản mới; chỉ xem lịch sử.</Notice>}
      {order && !isClaimed && (
        <Notice>Đơn thuộc quầy #{value(order, "counter_id")} hoặc đã đóng.</Notice>
      )}
      {editable && <ScanPanel expected="BATCH" onResolved={scanned} />}
      <Form
        id="picking-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const selected = input.filter((l) => number(l, "quantity") > 0);
            if (!selected.length) throw new Error("Nhập số lượng và kiểm thuốc ít nhất một dòng.");
            if (selected.some((l) => !l.checked || !number(l, "batchId")))
              throw new Error("Chọn lô và kiểm đúng thuốc ở từng dòng nhặt.");
            if (
              new Set(selected.map((l) => `${l.prescriptionLineId}:${l.batchId}`)).size !==
              selected.length
            )
              throw new Error("Gộp số nhặt của cùng một lô vào một dòng.");
            if (items.some((l) => total(number(l, "id")) > remaining(l)))
              throw new Error("Tổng nhặt vượt phần còn lại của đơn.");
            if (items.some((l) => total(number(l, "id")) < remaining(l)) && !reason.trim())
              throw new Error("Cần ghi lý do phần thiếu.");
            setCreated(
              await mutate(
                draftTarget
                  ? `/api/v1/pharmacy/dispensings/${draftTarget.id}`
                  : `/api/v1/pharmacy/counters/${counterId}/dispensings`,
                {
                  prescriptionId: p.id,
                  shortageReason: reason,
                  lines: selected,
                  ...(draftTarget ? { revision: draftTarget.revision } : {}),
                },
                draftTarget ? "PUT" : "POST",
                key,
              ),
            );
            onDone();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Không lưu được.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="at-table-wrap">
          <Table className="">
            <TableHeader>
              <TableRow>
                <TableHead>Thuốc theo đơn</TableHead>
                <TableHead>Số kê</TableHead>
                <TableHead>Đã giao</TableHead>
                <TableHead>Đang giữ</TableHead>
                <TableHead>Còn phải cấp</TableHead>
                <TableHead>Lô / tồn khả dụng</TableHead>
                <TableHead>Nhặt lần này</TableHead>
                <TableHead>Đối chiếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {input.map((entry, i) => {
                const l = items.find(
                    (l) => number(l, "id") === number(entry, "prescriptionLineId"),
                  )!,
                  selectedBatch = stock.find((b) => number(b, "id") === number(entry, "batchId"));
                return (
                  <TableRow key={i}>
                    <TableCell>
                      {value(l, "name_snapshot")} {value(l, "strength_snapshot")}
                      <small>{value(l, "unit_snapshot")}</small>
                    </TableCell>
                    <TableCell>{value(l, "quantity")}</TableCell>
                    <TableCell>{value(l, "delivered")}</TableCell>
                    <TableCell>{value(l, "reserved")}</TableCell>
                    <TableCell>{remaining(l)}</TableCell>
                    <TableCell>
                      <SelectInput
                        className="min-w-56"
                        aria-label={`Lô ${value(l, "name_snapshot")} ${i + 1}`}
                        value={value(entry, "batchId")}
                        disabled={!editable}
                        onChange={(e) => update(i, "batchId", e.target.value)}
                      >
                        <option value="">Chọn lô gần hết hạn</option>
                        {stock
                          .filter(
                            (b) =>
                              number(b, "medication_id") === number(l, "medication_id") &&
                              number(b, "active") &&
                              number(b, "available") > 0 &&
                              value(b, "expiry_date") >
                                new Date().toLocaleDateString("en-CA", {
                                  timeZone: "Asia/Ho_Chi_Minh",
                                }),
                          )
                          .map((b) => (
                            <option key={number(b, "id")} value={number(b, "id")}>
                              {value(b, "batch_code")} · {value(b, "expiry_date")} · còn{" "}
                              {value(b, "available")}
                            </option>
                          ))}
                      </SelectInput>
                      {selectedBatch && (
                        <small>
                          Hạn dùng: {value(selectedBatch, "expiry_date")} · Khả dụng:{" "}
                          {value(selectedBatch, "available")} {value(l, "unit_snapshot")}
                        </small>
                      )}
                    </TableCell>
                    <TableCell>
                      <TextInput
                        aria-label={`Số nhặt ${value(l, "name_snapshot")} ${i + 1}`}
                        type="number"
                        min="0"
                        step="0.01"
                        max={remaining(l)}
                        value={value(entry, "quantity")}
                        disabled={!editable}
                        onChange={(e) => update(i, "quantity", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        aria-label={`Kiểm thuốc ${value(l, "name_snapshot")} ${i + 1}`}
                        checked={!!entry.checked}
                        disabled={!editable}
                        onChange={(e) => update(i, "checked", e.target.checked)}
                        label={<> Đúng thuốc</>}
                      />
                      {editable &&
                        input.filter((x) => number(x, "prescriptionLineId") === number(l, "id"))
                          .length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setInput(input.filter((_, index) => index !== i));
                              setKey(crypto.randomUUID());
                            }}
                          >
                            Bỏ lô
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2 py-3">
            {items
              .filter((l) => remaining(l) > 0)
              .map((l) => (
                <Button
                  key={number(l, "id")}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setInput([...input, blank(l)]);
                    setKey(crypto.randomUUID());
                  }}
                >
                  Thêm lô: {value(l, "name_snapshot")}
                </Button>
              ))}
          </div>
        )}
        <Field label="Lý do thiếu / hẹn nhận bổ sung">
          <TextArea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setKey(crypto.randomUUID());
            }}
            disabled={!editable}
            maxLength={500}
          />
        </Field>
      </Form>
      {created && (
        <Card>
          <p>Đã lưu phiếu CP{value(created, "id")}. Kiểm lại rồi chốt để giữ tồn và tính tiền.</p>
          {value(created, "status") === "DRAFT" && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setDraftTarget(created);
                setCreated(null);
                setKey(crypto.randomUUID());
              }}
            >
              Sửa lại nháp
            </Button>
          )}
          <Button
            busy={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setCreated(
                  await mutate(`/api/v1/pharmacy/dispensings/${created.id}/commit`, {
                    revision: created.revision,
                  }),
                );
                onDone();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Không chốt được.");
                onDone();
              } finally {
                setBusy(false);
              }
            }}
            disabled={value(created, "status") !== "DRAFT"}
          >
            Chốt soạn và tính tiền
          </Button>
          {value(created, "status") === "READY" && (
            <DocumentButton
              type="PICKING_TICKET"
              sourceId={number(created, "id")}
              label="In phiếu soạn"
            />
          )}
        </Card>
      )}
    </Dialog>
  );
}
