"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState, type FormEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DateRangeShortcuts,
  EmptyState,
  PageHeader,
  FilterBar,
  SegmentedFilter,
} from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { api, queryString } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import type { PageResult } from "@/lib/types";
import { invoiceLabels, vietnamDate, type Invoice } from "@/lib/outpatient";
import {
  Button,
  Card,
  Field,
  Notice,
  Pager,
  SelectInput,
  StatusBadge,
  TextInput,
  Form,
} from "@/components/ui";
import type { Row } from "@/lib/workflow";
import { WorkflowPayment, ReceiptDocument } from "@/components/workflow-payment";
import { PrintButton, PrintLetterhead, QueryState, useUser } from "@/components/workspace-ui";
import { OnlinePaymentModal } from "@/components/customer/online-payment-modal";
import { OnlinePaymentMismatches } from "./online-payment-mismatches";

const staffStatusTabs = [
  { value: "OPEN", label: "Cần thu" },
  { value: "PARTIAL", label: "Thu dở" },
  { value: "PAID", label: "Đã thu đủ" },
  { value: "", label: "Tất cả" },
];
const portalStatusTabs = [
  { value: "", label: "Tất cả" },
  { value: "OPEN", label: invoiceLabels.OPEN },
  { value: "PARTIAL", label: invoiceLabels.PARTIAL },
  { value: "PAID", label: invoiceLabels.PAID },
];
const defaultFilters = () => ({
  q: "",
  status: "",
  from: vietnamDate(-30),
  to: vietnamDate(),
});

export function BillingWorkspace({
  portal = false,
  patientId = 0,
}: {
  portal?: boolean;
  patientId?: number;
}) {
  const me = useUser();
  const notify = useToast();
  const cashier = me.data?.roles.includes("CASHIER") ?? false;
  const cache = useQueryClient();
  const [filters, setFilters] = useState(defaultFilters);
  const settledFilters = { ...filters, q: useDebouncedValue(filters.q) };
  const [statusTouched, setStatusTouched] = useState(false);
  const status = !statusTouched && cashier && !portal ? "OPEN" : filters.status;
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selected, setSelected] = useState(0);
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error" | "success">("info");
  const [busy, setBusy] = useState(false);
  const [onlineInvoice, setOnlineInvoice] = useState(0);
  const defaults = defaultFilters();
  const filtered =
    !!filters.q ||
    filters.from !== defaults.from ||
    filters.to !== defaults.to ||
    (cashier && !portal ? status !== "OPEN" : !!status);
  const list = useQuery({
    queryKey: ["billing", me.data?.id, settledFilters, status, page, size, portal ? patientId : 0],
    enabled: !!me.data,
    queryFn: ({ signal }) =>
      api<PageResult<Invoice>>(
        `/api/v1/billing/search${queryString({ ...settledFilters, status, page, size, patientId: portal ? patientId || null : null })}`,
        { signal },
      ),
    refetchInterval: 15000,
  });
  const tabs = portal ? portalStatusTabs : staffStatusTabs;
  const counts = useQueries({
    queries: tabs.map((tab) => ({
      queryKey: [
        "billing",
        "count",
        me.data?.id,
        settledFilters.q,
        filters.from,
        filters.to,
        tab.value,
        portal ? patientId : 0,
      ],
      enabled: !!me.data,
      queryFn: ({ signal }) =>
        api<PageResult<Invoice>>(
          `/api/v1/billing/search${queryString({
            q: settledFilters.q,
            from: filters.from,
            to: filters.to,
            status: tab.value,
            page: 0,
            size: 1,
            patientId: portal ? patientId || null : null,
          })}`,
          { signal },
        ),
      select: (result: PageResult<Invoice>) => result.totalElements,
      refetchInterval: 30000,
    })),
  });
  const invoice = useQuery({
    queryKey: ["invoice", selected, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Invoice>(`/api/v1/billing/invoices/${selected}`, { signal }),
    enabled: selected > 0,
  });
  const workflowInvoice = useQuery({
    queryKey: ["workflow-invoice", selected, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row>(`/api/v1/billing/invoices/${selected}/workflow`, { signal }),
    enabled: selected > 0,
    refetchInterval: selected > 0 ? 10000 : false,
  });
  const hasRefunds =
    Array.isArray(workflowInvoice.data?.refunds) && workflowInvoice.data.refunds.length > 0;
  function choose(row: Invoice) {
    setSelected(row.id);
    setAmount(row.balance);
    setInitialAmount(row.balance);
    setMethod("CASH");
    setKey(crypto.randomUUID());
    setTransactionReference("");
    setPaymentNote("");
    setMessage("");
    if (portal)
      window.setTimeout(
        () =>
          document
            .getElementById("invoice-detail")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        120,
      );
  }
  function changeFilters(patch: Partial<typeof filters>) {
    setFilters({ ...filters, ...patch });
    setPage(0);
  }
  function chooseStatus(value: string) {
    setStatusTouched(true);
    setFilters({ ...filters, status: value });
    setPage(0);
  }
  function clearFilters() {
    setFilters(defaultFilters());
    setStatusTouched(false);
    setPage(0);
  }
  const balanceNumber = Number(invoice.data?.balance ?? 0);
  const amountNumber = Number(amount);
  const amountError =
    amount.trim() === "" || Number.isNaN(amountNumber)
      ? "Nhập số tiền thu."
      : amountNumber <= 0
        ? "Số tiền thu phải lớn hơn 0."
        : amountNumber > balanceNumber
          ? `Không được vượt quá số còn phải thu (${formatVnd(balanceNumber)}).`
          : "";
  const referenceError =
    method === "TRANSFER" && !transactionReference.trim()
      ? "Nhập mã giao dịch để đối soát chuyển khoản."
      : "";
  const [submitted, setSubmitted] = useState(false);
  async function pay(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (amountError || referenceError) {
      setMessageTone("error");
      setMessage(amountError || referenceError);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/v1/billing/invoices/${selected}/payments`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          amount,
          method,
          ...(transactionReference ? { transactionReference } : {}),
          ...(paymentNote ? { note: paymentNote } : {}),
        }),
      });
      await invalidateDataGroups(cache, [
        "billing",
        "invoice",
        "workflow-invoice",
        "online-payment",
        "receipts",
        "appointment-invoice",
        "doctor-queue",
        "reception-appointments",
        "pharmacy",
        "dispensings",
        "diagnostic",
        "bottlenecks",
        "dashboard-overview",
        "dashboard-workload",
      ]);
      setKey(crypto.randomUUID());
      setAmount("");
      setInitialAmount("");
      setMethod("CASH");
      setTransactionReference("");
      setPaymentNote("");
      setSubmitted(false);
      setMessageTone("success");
      setMessage("Đã ghi nhận phiếu thu.");
      notify("Đã ghi nhận phiếu thu. Có thể in biên lai bên dưới.", "success");
    } catch (e) {
      setMessageTone("error");
      setMessage(e instanceof Error ? e.message : "Không thu được tiền.");
    } finally {
      setBusy(false);
    }
  }
  const columns: ColumnDef<Invoice>[] = [
    {
      id: "code",
      header: "Hóa đơn / bệnh nhân",
      size: 200,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            type="button"
            className="at-cell-name"
            onClick={() => choose(row.original)}
          >
            {row.original.code}
          </Button>
          <small>{row.original.patientName}</small>
        </>
      ),
    },
    {
      id: "charge",
      header: "Khoản thu",
      size: 200,
      cell: ({ row }) => chargeLabel(row.original),
    },
    {
      id: "status",
      header: "Trạng thái",
      size: 140,
      cell: ({ row }) => (
        <StatusBadge status={row.original.status}>
          {invoiceLabels[row.original.status] ?? row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: "total",
      header: "Tổng tiền",
      size: 130,
      cell: ({ row }) => <span className="at-cell-price">{formatVnd(row.original.total)}</span>,
    },
    {
      id: "balance",
      header: "Còn phải thu",
      size: 140,
      cell: ({ row }) => (
        <span
          className={`at-cell-price ${Number(row.original.balance) > 0 ? "at-ops-money-due" : "at-ops-money-zero"}`}
        >
          {formatVnd(row.original.balance)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Chi tiết",
      size: 110,
      cell: ({ row }) => {
        const collect = cashier && ["OPEN", "PARTIAL"].includes(row.original.status);
        return (
          <div className="at-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button
              variant={collect ? "primary" : "ghost"}
              size="sm"
              type="button"
              onClick={() => choose(row.original)}
            >
              {collect ? "Thu tiền" : "Xem"}
            </Button>
          </div>
        );
      },
    },
  ];
  const details = invoice.data;
  const afterBalance = Math.max(0, balanceNumber - (amountError ? 0 : amountNumber));
  const paymentForm =
    cashier &&
    details &&
    workflowInvoice.data &&
    !hasRefunds &&
    ["OPEN", "PARTIAL"].includes(details.status) ? (
      <Form
        id="invoice-payment"
        noValidate
        busy={busy}
        onSubmit={pay}
        className="no-print at-pay-form"
      >
        <h3 className="at-section-title">Thu tiền</h3>
        <div className="at-form-grid">
          <Field
            label="Số tiền thu (VND)"
            required
            hint={`Còn phải thu ${formatVnd(details.balance)}. Có thể thu một phần.`}
            error={submitted || amount !== initialAmount ? amountError : ""}
          >
            <TextInput
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={details.balance}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setKey(crypto.randomUUID());
              }}
            />
          </Field>
          <Field label="Hình thức">
            <SelectInput
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setKey(crypto.randomUUID());
              }}
            >
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản thủ công</option>
            </SelectInput>
          </Field>
          {method === "TRANSFER" && (
            <Field
              label="Mã giao dịch đối soát"
              required
              hint="Chỉ ghi nhận sau khi đã đối soát tiền về tài khoản."
              error={submitted ? referenceError : ""}
            >
              <TextInput
                required
                value={transactionReference}
                onChange={(e) => {
                  setTransactionReference(e.target.value);
                  setKey(crypto.randomUUID());
                }}
                maxLength={100}
              />
            </Field>
          )}
          <div className={method === "TRANSFER" ? "" : "at-span-2"}>
            <Field label="Ghi chú thu tiền" hint="Không bắt buộc.">
              <TextInput
                value={paymentNote}
                onChange={(e) => {
                  setPaymentNote(e.target.value);
                  setKey(crypto.randomUUID());
                }}
                maxLength={500}
              />
            </Field>
          </div>
        </div>
        {amount !== details.balance && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setAmount(details.balance);
                setKey(crypto.randomUUID());
              }}
            >
              Thu đủ {formatVnd(details.balance)}
            </Button>
          </div>
        )}
        <div className="at-pay-after" aria-live="polite">
          <span>
            Thu <strong>{amountError ? "—" : formatVnd(amountNumber)}</strong> ·{" "}
            {method === "CASH" ? "Tiền mặt" : "Chuyển khoản thủ công"} · {details.patientName}
          </span>
          <span>
            Còn lại sau khi thu: <strong>{formatVnd(afterBalance)}</strong>
          </span>
        </div>
        {portal && (
          <div className="at-form-actions">
            <Button busy={busy} disabled={!key} type="submit">
              Ghi nhận thu tiền
            </Button>
          </div>
        )}
      </Form>
    ) : null;
  const Container = portal ? "main" : "section";
  const tabOptions = tabs.map((tab, index) => ({
    ...tab,
    count: counts[index]?.data,
  }));
  const emptyList = (
    <EmptyState
      title={filtered ? "Không có hóa đơn khớp bộ lọc" : "Chưa có hóa đơn nào"}
      description={
        portal
          ? filtered
            ? "Thử chọn khoảng ngày rộng hơn hoặc trạng thái khác."
            : "Hóa đơn xuất hiện sau khi lịch khám được tiếp nhận hoặc khi có thuốc, cận lâm sàng cần thanh toán."
          : filtered
            ? "Thử đổi trạng thái, khoảng ngày hoặc từ khóa tìm kiếm."
            : "Hóa đơn công khám được tạo khi lễ tân tiếp nhận bệnh nhân."
      }
      action={
        filtered ? (
          <Button variant="ghost" type="button" onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
        ) : undefined
      }
    />
  );
  return (
    <Container className={portal ? "mx-auto max-w-5xl space-y-5 px-4 py-8" : "space-y-5"}>
      <PageHeader
        eyebrow={portal ? undefined : "Vận hành"}
        title={portal ? "Hóa đơn của tôi" : "Hóa đơn và thu phí"}
        description={
          portal
            ? "Xem công khám, thuốc và cận lâm sàng. Mỗi nhóm phí là một hóa đơn riêng."
            : cashier
              ? "Thu đủ công khám trước khi bác sĩ bắt đầu. Tiền thuốc và cận lâm sàng thu theo hóa đơn riêng, sau khi có phiếu soạn hoặc chỉ định."
              : "Theo dõi công khám, thuốc và cận lâm sàng. Thu tiền thuộc thu ngân được phân công."
        }
      />
      <div className="no-print at-ops-toolbar">
        <SegmentedFilter
          label="Lọc theo trạng thái hóa đơn"
          value={status}
          options={tabOptions}
          onChange={chooseStatus}
        />
        <DateRangeShortcuts
          from={filters.from}
          to={filters.to}
          onChange={(range) => changeFilters(range)}
        />
      </div>
      <FilterBar
        appearance="custom"
        className="no-print at-filter-bar at-ops-filters"
        onClear={clearFilters}
      >
        <Field label="Tìm bệnh nhân / mã">
          <TextInput
            value={filters.q}
            placeholder="Tên bệnh nhân hoặc mã hóa đơn"
            onChange={(e) => changeFilters({ q: e.target.value })}
          />
        </Field>
        <Field label="Từ ngày">
          <TextInput
            type="date"
            required
            value={filters.from}
            onChange={(e) => changeFilters({ from: e.target.value })}
          />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            required
            value={filters.to}
            onChange={(e) => changeFilters({ to: e.target.value })}
          />
        </Field>
        <Field label="Trạng thái">
          <SelectInput value={status} onChange={(e) => chooseStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(invoiceLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      <div className="no-print">
        {!portal && (cashier || me.data?.roles.includes("ADMIN")) && <OnlinePaymentMismatches />}
        <QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()} />
        {portal
          ? list.data &&
            (list.data.content.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {list.data.content.map((row) => (
                  <Card key={row.id} className="at-invoice-card">
                    <div className="at-invoice-card-head">
                      <h2>
                        {row.code}
                        <small>
                          {row.patientName} · {chargeLabel(row)}
                        </small>
                      </h2>
                      <StatusBadge status={row.status}>
                        {invoiceLabels[row.status] ?? row.status}
                      </StatusBadge>
                    </div>
                    <dl className="at-invoice-card-money">
                      <div>
                        <dt>Tổng tiền</dt>
                        <dd>{formatVnd(row.total)}</dd>
                      </div>
                      <div>
                        <dt>Đã thu</dt>
                        <dd>{formatVnd(row.paid)}</dd>
                      </div>
                      <div>
                        <dt>Còn phải thu</dt>
                        <dd className={Number(row.balance) > 0 ? "at-ops-money-due" : undefined}>
                          {formatVnd(row.balance)}
                        </dd>
                      </div>
                    </dl>
                    <div>
                      <Button
                        variant={selected === row.id ? "primary" : "ghost"}
                        size="sm"
                        type="button"
                        onClick={() => choose(row)}
                      >
                        Xem chi tiết
                      </Button>
                      {["OPEN", "PARTIAL"].includes(row.status) && Number(row.balance) > 0 && (
                        <Button size="sm" type="button" onClick={() => setOnlineInvoice(row.id)}>
                          Thanh toán bằng QR
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              emptyList
            ))
          : list.data && (
              <DataTable
                fitColumns
                className="at-catalog-table at-ops-table at-ops-invoices"
                caption="Danh sách hóa đơn"
                rowLabel={(row) => `Mở hóa đơn ${row.code} của ${row.patientName}`}
                busy={list.isFetching && !list.isLoading}
                selected={selected}
                data={list.data.content}
                columns={columns}
                onRow={choose}
                empty={emptyList}
              />
            )}
        <Pager
          page={page}
          totalPages={list.data?.totalPages ?? 0}
          totalElements={list.data?.totalElements}
          size={size}
          onSize={(next) => {
            setSize(next);
            setPage(0);
          }}
          onPage={setPage}
        />
      </div>
      {onlineInvoice > 0 && (
        <OnlinePaymentModal
          invoiceId={onlineInvoice}
          onClose={() => setOnlineInvoice(0)}
          onPaid={() => {
            void cache.invalidateQueries({ queryKey: ["billing"] });
            void cache.invalidateQueries({ queryKey: ["invoice"] });
            void cache.invalidateQueries({ queryKey: ["workflow-invoice"] });
          }}
        />
      )}
      {portal && (
        <>
          {message && (
            <div className="no-print">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}
          <div id="invoice-detail">
            {selected > 0 && (
              <QueryState
                loading={invoice.isLoading}
                error={invoice.error}
                retry={() => void invoice.refetch()}
              />
            )}
          </div>
          {details && (
            <Card className="space-y-5">
              <InvoiceDocument invoice={details} />
              <div className="no-print at-ops-actions">
                <PrintButton />
                <Button variant="ghost" type="button" onClick={() => setSelected(0)}>
                  Đóng chi tiết
                </Button>
              </div>
              <WorkflowPayment invoiceId={details.id} cashier={cashier} status={details.status} />
              {paymentForm}
            </Card>
          )}
        </>
      )}
      {!portal && (
        <>
          <Dialog
            open={selected > 0}
            onOpenChange={(open) => {
              if (!open) setSelected(0);
            }}
            size="wide"
            title="Chi tiết hóa đơn"
            description={details?.code}
            busy={busy}
            dirty={
              !!paymentForm &&
              (amount !== initialAmount ||
                method !== "CASH" ||
                !!transactionReference ||
                !!paymentNote)
            }
            footer={
              <>
                <DialogClose>
                  <Button variant="ghost" type="button" disabled={busy}>
                    Đóng
                  </Button>
                </DialogClose>
                {details && <PrintButton />}
                {paymentForm && (
                  <Button busy={busy} disabled={!key} type="submit" form="invoice-payment">
                    Ghi nhận thu tiền
                  </Button>
                )}
              </>
            }
          >
            <QueryState
              loading={invoice.isLoading}
              error={invoice.error}
              retry={() => void invoice.refetch()}
            />
            {message && <Notice tone={messageTone}>{message}</Notice>}
            {details && (
              <div className="space-y-5">
                <InvoiceDocument invoice={details} />
                <WorkflowPayment invoiceId={details.id} cashier={cashier} status={details.status} />
                {paymentForm}
              </div>
            )}
          </Dialog>
          {selected > 0 && details && (
            <div className="hidden print:block">
              <InvoiceDocument invoice={details} />
            </div>
          )}
        </>
      )}
    </Container>
  );
}
function chargeLabel(invoice: Invoice) {
  const names: Record<string, string> = {
    EXAMINATION: "Công khám",
    MEDICATION: "Thuốc",
    DIAGNOSTIC: "Cận lâm sàng",
  };
  const lines = invoice.lines.filter((line) => line.status !== "VOID");
  const kind = [...new Set(lines.map((line) => names[line.sourceType] ?? "Dịch vụ"))].join(", ");
  const detail = lines
    .map((line) => line.description)
    .filter(Boolean)
    .slice(0, 2)
    .join("; ");
  return detail || kind || "—";
}
function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  return (
    <div className="print-document space-y-4">
      <PrintLetterhead />
      <div className="at-ops-panel-head">
        <div>
          <h2 className="text-xl font-semibold">Hóa đơn {invoice.code}</h2>
          <p>{invoice.patientName}</p>
        </div>
        <StatusBadge status={invoice.status}>
          {invoiceLabels[invoice.status] ?? invoice.status}
        </StatusBadge>
      </div>
      <div className="at-table-wrap">
        <Table className="at-invoice-lines">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Khoản phí</TableHead>
              <TableHead scope="col">Số lượng</TableHead>
              <TableHead scope="col">Đơn giá</TableHead>
              <TableHead scope="col">Thành tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  {line.description}
                  {line.status === "VOID" && <small>Đã hủy dòng</small>}
                </TableCell>
                <TableCell>
                  {line.quantity} {line.unit}
                </TableCell>
                <TableCell>{formatVnd(line.unitPrice)}</TableCell>
                <TableCell>{formatVnd(line.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <dl className="at-pay-summary">
        <div>
          <dt>Tổng tiền</dt>
          <dd>{formatVnd(invoice.total)}</dd>
        </div>
        <div data-tone={Number(invoice.paid) > 0 ? "paid" : undefined}>
          <dt>Đã thu</dt>
          <dd>{formatVnd(invoice.paid)}</dd>
        </div>
        <div data-tone={Number(invoice.balance) > 0 ? "due" : "paid"}>
          <dt>Còn phải thu</dt>
          <dd>{formatVnd(invoice.balance)}</dd>
        </div>
      </dl>
      {invoice.receipts.map((receipt) => (
        <section className="border-t border-line pt-3" key={receipt.id}>
          <h3 className="font-semibold">Phiếu thu {receipt.code}</h3>
          <ReceiptDocument id={receipt.id} />
          <p>
            {formatVnd(receipt.amount)} ·{" "}
            {receipt.method === "CASH"
              ? "Tiền mặt"
              : receipt.method === "BANK_TRANSFER_ONLINE"
                ? "Thanh toán online"
                : "Chuyển khoản thủ công"}{" "}
            · {formatDateTime(receipt.recordedAt)}
          </p>
        </section>
      ))}
    </div>
  );
}
