"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DateRangeShortcuts,
  DetailList,
  EmptyState,
  PageHeader,
  FilterBar,
} from "@/components/ui/data-display";
import { ConfirmDialog, Dialog, DialogClose, MenuItem, RowMenu } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { api, queryString } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Appointment, Doctor, PageResult } from "@/lib/types";
import {
  appointmentLabels,
  encounterLabels,
  invoiceLabels,
  vietnamDate,
  type Encounter,
  type Invoice,
} from "@/lib/outpatient";
import {
  Button,
  Field,
  Notice,
  Pager,
  SelectInput,
  StatusBadge,
  TextInput,
  ButtonLink,
} from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";
import { ReceptionScan } from "./reception-scan";
import { DocumentButton } from "@/components/workflow-tools";
import { useEventStream } from "@/hooks/use-event-stream";
import { QueueCallButton } from "./queue-call-button";
import { Disclosure } from "@/components/ui/disclosure";
import { BottleneckPanel, AbsenceCoordinationPanel } from "./operations-parts";
import { PatientSummaryPanel } from "./clinical-productivity-parts";

const defaultFilters = (admin: boolean) => ({
  q: "",
  from: vietnamDate(),
  to: vietnamDate(admin ? 30 : 0),
  doctorId: "",
  status: "",
});

/** Waiting patients first (checked in, by queue number), finished / closed visits last. */
const queueRank: Record<string, number> = {
  CHECKED_IN: 0,
  CONFIRMED: 1,
  NEEDS_RESCHEDULE: 2,
  COMPLETED: 3,
};
function sortQueue(rows: Appointment[]) {
  return [...rows].sort(
    (a, b) =>
      (queueRank[a.status] ?? 4) - (queueRank[b.status] ?? 4) ||
      (a.queueNumber ?? Number.MAX_SAFE_INTEGER) - (b.queueNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.slot.startsAt.localeCompare(b.slot.startsAt),
  );
}

export function AppointmentsWorkspace({
  doctor = false,
  admin = false,
}: {
  doctor?: boolean;
  admin?: boolean;
}) {
  const router = useRouter();
  const cache = useQueryClient();
  const stream = useEventStream("/api/v1/realtime/stream", () => {
    // Stream payloads are invalidations only. Every read remains authorized by REST.
    void cache.invalidateQueries({
      predicate: (query) =>
        [
          "doctor-queue",
          "reception-appointments",
          "appointment-encounter",
          "appointment-invoice",
          "queue-call-state",
          "dashboard-overview",
        ].includes(String(query.queryKey[0])),
    });
  });
  const [filters, setFilters] = useState(() => defaultFilters(admin));
  const settledFilters = { ...filters, q: useDebouncedValue(filters.q) };
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const filtered = JSON.stringify(filters) !== JSON.stringify(defaultFilters(admin));
  function change(patch: Partial<typeof filters>) {
    setFilters({ ...filters, ...patch });
    setPage(0);
  }
  function clearFilters() {
    setFilters(defaultFilters(admin));
    setPage(0);
  }
  const columns: ColumnDef<Appointment>[] = [
    {
      id: "queue",
      header: "Số chờ",
      size: 80,
      cell: ({ row }) =>
        row.original.queueNumber ? (
          <span
            className="at-queue-no"
            data-state={row.original.status === "CHECKED_IN" ? "active" : undefined}
            aria-label={`Số chờ ${row.original.queueNumber}`}
          >
            {row.original.queueNumber}
          </span>
        ) : (
          <span className="at-queue-none" aria-label="Chưa có số chờ">
            —
          </span>
        ),
    },
    {
      id: "patient",
      header: "Bệnh nhân / mã lịch",
      size: 220,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            type="button"
            className="at-cell-name"
            onClick={() => setSelected(row.original)}
          >
            {row.original.patientName}
          </Button>
          <small>{row.original.code}</small>
        </>
      ),
    },
    {
      id: "time",
      header: "Thời gian / phòng",
      size: 180,
      cell: ({ row }) => (
        <>
          {formatDateTime(row.original.slot.startsAt)}
          <small>{row.original.slot.roomName}</small>
        </>
      ),
    },
    doctor
      ? {
          id: "service",
          header: "Dịch vụ / lý do khám",
          size: 220,
          cell: ({ row }) => (
            <>
              {row.original.slot.serviceName}
              <small>{row.original.symptoms || "Chưa ghi lý do khám"}</small>
            </>
          ),
        }
      : {
          id: "doctor",
          header: "Bác sĩ / dịch vụ",
          size: 230,
          cell: ({ row }) => (
            <>
              {row.original.slot.doctorName}
              <small>{row.original.slot.serviceName}</small>
            </>
          ),
        },
    {
      id: "status",
      header: "Trạng thái",
      size: 150,
      cell: ({ row }) => (
        <StatusBadge status={row.original.status}>
          {appointmentLabels[row.original.status] ?? row.original.status}
        </StatusBadge>
      ),
    },
    ...(doctor
      ? [
          {
            id: "next",
            header: "Bước tiếp theo",
            size: 200,
            cell: ({ row }) => <DoctorNextAction appointment={row.original} />,
          } satisfies ColumnDef<Appointment>,
        ]
      : []),
    {
      id: "actions",
      header: "Thao tác",
      size: doctor ? 90 : 190,
      cell: ({ row }) => (
        <div className="at-row-actions" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="sm" type="button" onClick={() => setSelected(row.original)}>
            Xem
          </Button>
          {!doctor && !admin && row.original.status === "CONFIRMED" && (
            <CheckInButton appointment={row.original} />
          )}
          {!doctor && !admin && ["CONFIRMED", "NEEDS_RESCHEDULE"].includes(row.original.status) && (
            <RowMenu label={`Thao tác khác cho ${row.original.code}`}>
              <MenuItem
                onSelect={() =>
                  router.push(
                    `/booking?reschedule=${row.original.id}&patientId=${row.original.patientId}`,
                  )
                }
              >
                Đổi lịch
              </MenuItem>
              <MenuItem onSelect={() => setSelected(row.original)}>
                Hủy / vắng hẹn trong chi tiết
              </MenuItem>
            </RowMenu>
          )}
        </div>
      ),
    },
  ];
  const doctors = useQuery({
    queryKey: ["staff-doctor-references"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Pick<Doctor, "id" | "fullName">[]>("/api/v1/schedules/doctors", { signal }),
    enabled: !doctor,
  });
  const list = useQuery({
    queryKey: [doctor ? "doctor-queue" : "reception-appointments", settledFilters, page, size],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Appointment>>(
        `/api/v1/appointments/search${queryString({ ...settledFilters, page, size })}`,
        { signal },
      ),
    refetchInterval: stream.polling ? 10000 : false,
  });
  const rows = list.data ? (doctor ? sortQueue(list.data.content) : list.data.content) : [];
  return (
    <>
      <PageHeader
        eyebrow="Vận hành"
        title={doctor ? "Hàng chờ khám" : admin ? "Theo dõi lịch hẹn" : "Tiếp nhận trong ngày"}
        description={
          doctor
            ? "Chỉ bắt đầu khám khi lễ tân đã tiếp nhận và thu ngân đã thu đủ công khám. Đơn thuốc chốt sau khi hoàn tất bệnh án."
            : admin
              ? "Xem lịch đã đặt, đã vào khám, vắng hoặc cần đổi. Tiếp nhận và thu tiền thuộc lễ tân và thu ngân."
              : "Xác nhận bệnh nhân có mặt, cấp số thứ tự và in phiếu khám. Bệnh nhân sang thu ngân đóng công khám trước khi vào phòng."
        }
        actions={
          !doctor && !admin ? (
            <>
              <ButtonLink variant="ghost" href="/staff/patients">
                Tạo / sửa hồ sơ
              </ButtonLink>
              <ButtonLink href="/booking">Đặt lịch hộ</ButtonLink>
              <ButtonLink
                variant="ghost"
                href={`/display/queue${rows.length ? `?rooms=${[...new Set(rows.map((row) => row.slot.roomId))].join(",")}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở màn hình TV
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      {!doctor && !admin && <ReceptionScan />}
      <FilterBar
        appearance="custom"
        className="at-filter-bar at-ops-filters"
        onClear={clearFilters}
      >
        <Field label="Tên hoặc mã lịch">
          <TextInput
            value={filters.q}
            placeholder="Nhập tên bệnh nhân hoặc mã lịch"
            onChange={(e) => change({ q: e.target.value })}
          />
        </Field>
        <Field label="Từ ngày">
          <TextInput
            type="date"
            value={filters.from}
            onChange={(e) => change({ from: e.target.value })}
          />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            value={filters.to}
            onChange={(e) => change({ to: e.target.value })}
          />
        </Field>
        <Field label="Trạng thái">
          <SelectInput value={filters.status} onChange={(e) => change({ status: e.target.value })}>
            <option value="">Tất cả</option>
            {Object.entries(appointmentLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {!doctor && (
          <Field label="Bác sĩ">
            <SelectInput
              value={filters.doctorId}
              onChange={(e) => change({ doctorId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {[...new Map(doctors.data?.map((d) => [d.id, d])).values()].map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
      </FilterBar>
      <Disclosure
        className="at-ops-disclosure no-print"
        title="Theo dõi điểm nghẽn & điều phối lịch"
      >
        <div className="space-y-4">
          <BottleneckPanel compact />
          {!doctor && <AbsenceCoordinationPanel admin={admin} />}
        </div>
      </Disclosure>
      <div className="at-ops-toolbar">
        <DateRangeShortcuts
          from={filters.from}
          to={filters.to}
          presets={["today", "tomorrow", "week", "thisMonth"]}
          onChange={(range) => change(range)}
        />
        <p className="at-ops-summary" aria-live="polite">
          {doctor && "Đã tiếp nhận xếp trước, theo số chờ. "}
          Tự động làm mới mỗi 15 giây.{" "}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            busy={list.isFetching && !list.isLoading}
            onClick={() => void list.refetch()}
          >
            Làm mới
          </Button>
        </p>
      </div>
      {!doctor && (
        <QueryState
          loading={doctors.isLoading}
          error={doctors.error}
          retry={() => void doctors.refetch()}
        />
      )}
      <QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()} />
      {list.data && (
        <DataTable
          fitColumns
          className="at-catalog-table at-ops-table at-ops-appointments"
          caption={
            doctor
              ? "Hàng chờ khám"
              : admin
                ? "Danh sách lịch hẹn"
                : "Danh sách tiếp nhận trong ngày"
          }
          rowLabel={(row) => `Mở lịch hẹn ${row.code} của ${row.patientName}`}
          busy={list.isFetching && !list.isLoading}
          data={rows}
          columns={columns}
          onRow={setSelected}
          empty={
            <EmptyState
              title={filtered ? "Không có lịch hẹn khớp bộ lọc" : "Chưa có lịch hẹn nào"}
              description={
                filtered
                  ? "Thử đổi khoảng ngày, trạng thái hoặc từ khóa tìm kiếm."
                  : doctor
                    ? "Hàng chờ trống. Bệnh nhân xuất hiện ở đây sau khi lễ tân tiếp nhận."
                    : admin
                      ? "Chưa có lịch hẹn trong 30 ngày tới."
                      : "Hôm nay chưa có lịch hẹn. Bạn có thể đặt lịch hộ cho bệnh nhân."
              }
              action={
                filtered ? (
                  <Button variant="ghost" type="button" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : !doctor && !admin ? (
                  <ButtonLink href="/booking">Đặt lịch hộ</ButtonLink>
                ) : undefined
              }
            />
          }
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        size="wide"
        title="Chi tiết lịch hẹn"
        description={selected?.code}
        busy={busy}
        footer={
          <DialogClose>
            <Button variant="ghost" type="button" disabled={busy}>
              Đóng
            </Button>
          </DialogClose>
        }
      >
        {selected && ["CHECKED_IN", "COMPLETED"].includes(selected.status) && (
          <DocumentButton type="EXAMINATION_TICKET" sourceId={selected.id} label="In phiếu khám" />
        )}
        {selected && (
          <AppointmentCard
            key={selected.id}
            appointment={list.data?.content.find((a) => a.id === selected.id) ?? selected}
            doctor={doctor}
            admin={admin}
            busy={busy}
            setBusy={setBusy}
            onUpdate={setSelected}
          />
        )}
      </Dialog>
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
    </>
  );
}
function CheckInButton({ appointment }: { appointment: Appointment }) {
  const cache = useQueryClient();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      busy={busy}
      onClick={() => {
        setBusy(true);
        void api<Appointment>(`/api/v1/appointments/${appointment.id}/check-in`, {
          method: "POST",
        })
          .then(() => {
            notify(`Đã tiếp nhận ${appointment.patientName} · ${appointment.code}.`, "success");
            return invalidateDataGroups(cache, [
              "appointment",
              "reception-appointments",
              "doctor-queue",
              "encounter",
              "nursing-encounters",
              "billing",
              "slots",
              "bottlenecks",
              "dashboard-overview",
              "dashboard-workload",
            ]);
          })
          .catch((error: unknown) =>
            notify(error instanceof Error ? error.message : "Không tiếp nhận được.", "error"),
          )
          .finally(() => setBusy(false));
      }}
    >
      Tiếp nhận
    </Button>
  );
}

function DoctorNextAction({ appointment }: { appointment: Appointment }) {
  const received = ["CHECKED_IN", "COMPLETED"].includes(appointment.status);
  const invoice = useQuery({
    queryKey: ["appointment-invoice", appointment.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Invoice>(`/api/v1/billing/appointments/${appointment.id}/invoice`, { signal }),
    enabled: received,
  });
  const encounter = useQuery({
    queryKey: ["appointment-encounter", appointment.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Encounter>(`/api/v1/encounters/appointments/${appointment.id}`, { signal }),
    enabled: received,
  });
  if (appointment.status === "CONFIRMED")
    return (
      <div className="at-next-step">
        <StatusBadge tone="neutral">Chờ lễ tân tiếp nhận</StatusBadge>
      </div>
    );
  if (!received)
    return (
      <div className="at-next-step">
        <StatusBadge status={appointment.status}>
          {appointmentLabels[appointment.status] ?? appointment.status}
        </StatusBadge>
      </div>
    );
  if (invoice.isLoading || encounter.isLoading)
    return <span className="at-cell-empty">Đang đối chiếu thu phí…</span>;
  if (invoice.data && invoice.data.status !== "PAID")
    return (
      <div className="at-next-step">
        <StatusBadge tone="warning">Chờ thu đủ công khám</StatusBadge>
        <small>Hướng bệnh nhân sang thu ngân</small>
      </div>
    );
  if (encounter.data?.status === "COMPLETED")
    return (
      <div className="at-next-step">
        <StatusBadge tone="success">Đã hoàn tất khám</StatusBadge>
        <ButtonLink
          variant="ghost"
          size="sm"
          href={`/staff/encounters/${encounter.data.id}`}
          aria-label={`Xem bệnh án ${appointment.code}`}
        >
          Xem bệnh án
        </ButtonLink>
      </div>
    );
  if (!encounter.data || !invoice.data)
    return (
      <div className="at-next-step">
        <StatusBadge tone="neutral">Chưa sẵn sàng</StatusBadge>
      </div>
    );
  if (encounter.data.status === "IN_PROGRESS")
    return (
      <div className="at-next-step">
        <StatusBadge tone="info">Đang khám</StatusBadge>
        <small>Mở để tiếp tục khám</small>
      </div>
    );
  if (encounter.data.status === "WAITING_RESULTS")
    return (
      <div className="at-next-step">
        <StatusBadge tone="warning">Chờ kết quả CLS</StatusBadge>
        <small>Khám tiếp sau khi có kết quả</small>
      </div>
    );
  return (
    <div className="at-next-step">
      <StatusBadge tone="success">Sẵn sàng khám</StatusBadge>
      <QueueCallButton appointment={appointment} />
      <small>Bấm Xem để bắt đầu khám</small>
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  doctor,
  admin,
  busy,
  setBusy,
  onUpdate,
}: {
  appointment: Appointment;
  doctor: boolean;
  admin: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onUpdate: (appointment: Appointment) => void;
}) {
  const cache = useQueryClient();
  const notify = useToast();
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [noShow, setNoShow] = useState(false);
  const received = ["CHECKED_IN", "COMPLETED"].includes(a.status);
  const invoice = useQuery({
    queryKey: ["appointment-invoice", a.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Invoice>(`/api/v1/billing/appointments/${a.id}/invoice`, { signal }),
    enabled: received,
    refetchInterval: 15000,
  });
  const encounter = useQuery({
    queryKey: ["appointment-encounter", a.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Encounter>(`/api/v1/encounters/appointments/${a.id}`, { signal }),
    enabled: doctor && received,
    refetchInterval: 15000,
  });
  const history = useQuery({
    queryKey: ["appointment-history", a.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ id: number; action: string; occurredAt: string; actorName: string }[]>(
        `/api/v1/appointments/${a.id}/history`,
        { signal },
      ),
    enabled: showHistory,
  });
  const router = useRouter();
  async function action(op: string, reason?: string) {
    setBusy(true);
    setMessage("");
    try {
      if (op === "start") {
        const e = await api<Encounter>(`/api/v1/encounters/appointments/${a.id}/start`, {
          method: "POST",
        });
        router.push(`/staff/encounters/${e.id}`);
        return;
      }
      const updated = await api<Appointment>(`/api/v1/appointments/${a.id}/${op}`, {
        method: "POST",
        ...(reason ? { body: JSON.stringify({ reason }) } : {}),
      });
      onUpdate(updated);
      setMessage("Đã cập nhật lịch hẹn.");
      notify(`Đã cập nhật lịch hẹn ${a.code}.`, "success");
      await invalidateDataGroups(cache, [
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "encounter",
        "nursing-encounters",
        "billing",
        "slots",
        "bottlenecks",
        "dashboard-overview",
        "dashboard-workload",
      ]);
    } catch (e) {
      if (op === "cancel" || op === "no-show") throw e;
      setMessage(e instanceof Error ? e.message : "Không cập nhật được lịch hẹn.");
    } finally {
      setBusy(false);
    }
  }
  const paid = invoice.data?.status === "PAID";
  return (
    <>
      <div className="at-ops-panel">
        <div className="at-ops-panel-head">
          <h3>
            {a.patientName}
            <small>{a.code}</small>
          </h3>
          <StatusBadge status={a.status}>{appointmentLabels[a.status] ?? a.status}</StatusBadge>
        </div>
        <DetailList
          items={[
            { label: "Bác sĩ", value: a.slot.doctorName },
            { label: "Thời gian", value: formatDateTime(a.slot.startsAt) },
            { label: "Phòng", value: a.slot.roomName },
            { label: "Dịch vụ", value: a.slot.serviceName },
            ...(a.queueNumber
              ? [{ label: "Số chờ", value: <strong>{a.queueNumber}</strong> }]
              : []),
            ...(a.symptoms ? [{ label: "Lý do khám", value: a.symptoms }] : []),
            ...(received
              ? [
                  {
                    label: "Thanh toán",
                    value: invoice.data ? (
                      <StatusBadge status={invoice.data.status}>
                        {invoiceLabels[invoice.data.status]}
                      </StatusBadge>
                    ) : invoice.error ? (
                      invoice.error.message
                    ) : (
                      "Đang tải…"
                    ),
                  },
                ]
              : []),
            ...(doctor && received && encounter.data
              ? [
                  {
                    label: "Bệnh án",
                    value: (
                      <StatusBadge status={encounter.data.status}>
                        {encounter.data.status === "WAITING"
                          ? "Chờ khám"
                          : encounterLabels[encounter.data.status]}
                      </StatusBadge>
                    ),
                  },
                ]
              : []),
          ]}
        />
        {!doctor && !admin && a.status === "CONFIRMED" && (
          <Notice>
            Bước này: xác nhận người đến khám và cấp số thứ tự. Thu công khám ở quầy thu ngân.
          </Notice>
        )}
        {received && invoice.data && invoice.data.status !== "PAID" && (
          <Notice tone="warning">
            Công khám chưa thu đủ nên bác sĩ chưa được bắt đầu. Hướng bệnh nhân sang thu ngân.
          </Notice>
        )}
        {doctor && received && paid && encounter.data?.status === "WAITING" && (
          <Notice tone="success">
            Đã thu đủ công khám. Bắt đầu bệnh án, phân công điều dưỡng nếu cần đo sinh hiệu.
          </Notice>
        )}
        {doctor && received && (
          <QueryState
            loading={encounter.isLoading}
            error={encounter.error}
            retry={() => void encounter.refetch()}
          />
        )}
        <div className="at-ops-actions">
          {doctor && encounter.data && (
            <Button variant="ghost" onClick={() => setShowSummary(!showSummary)}>
              Xem nhanh trước khám
            </Button>
          )}
          {!doctor && !admin && a.status === "CONFIRMED" && (
            <>
              <Button disabled={busy} type="button" onClick={() => void action("check-in")}>
                Tiếp nhận
              </Button>
              <Button disabled={busy} variant="ghost" type="button" onClick={() => setNoShow(true)}>
                Vắng hẹn
              </Button>
            </>
          )}
          {!doctor && !admin && ["CONFIRMED", "NEEDS_RESCHEDULE"].includes(a.status) && (
            <>
              <ButtonLink
                variant="ghost"
                href={`/booking?reschedule=${a.id}&patientId=${a.patientId}`}
              >
                Đổi lịch
              </ButtonLink>
              <Button
                disabled={busy}
                variant="danger"
                type="button"
                onClick={() => setCancel(true)}
              >
                Hủy lịch
              </Button>
            </>
          )}
          {doctor &&
            a.status === "CHECKED_IN" &&
            encounter.data &&
            encounter.data.status !== "COMPLETED" && (
              <Button
                disabled={busy || invoice.data?.status !== "PAID"}
                type="button"
                onClick={() => void action("start")}
              >
                {encounter.data.status === "IN_PROGRESS"
                  ? "Tiếp tục khám"
                  : encounter.data.status === "WAITING_RESULTS"
                    ? "Khám tiếp sau kết quả"
                    : "Bắt đầu khám"}
              </Button>
            )}
          {doctor && received && encounter.data && encounter.data.status !== "COMPLETED" && (
            <ButtonLink variant="ghost" href={`/staff/encounters/${encounter.data.id}`}>
              Bệnh án / phân công điều dưỡng
            </ButtonLink>
          )}
          {doctor && encounter.data?.status === "COMPLETED" && (
            <ButtonLink variant="ghost" href={`/staff/encounters/${encounter.data.id}`}>
              Xem bệnh án
            </ButtonLink>
          )}
          <Button
            variant="ghost"
            type="button"
            aria-expanded={showHistory}
            onClick={() => setShowHistory(!showHistory)}
          >
            Lịch sử thay đổi
          </Button>
        </div>
        {message && <Notice tone="success">{message}</Notice>}
        {doctor && encounter.data && showSummary && (
          <PatientSummaryPanel encounterId={encounter.data.id} />
        )}
        {showHistory && (
          <div>
            <QueryState
              loading={history.isLoading}
              error={history.error}
              empty={history.data?.length === 0}
              emptyTitle="Chưa có thay đổi nào"
              emptyDescription="Lịch hẹn này chưa được cập nhật sau khi tạo."
              retry={() => void history.refetch()}
            />
            {!!history.data?.length && (
              <ol className="at-ops-timeline" aria-label="Lịch sử thay đổi lịch hẹn">
                {history.data.map((h) => (
                  <li key={h.id}>
                    <strong>{h.action}</strong>
                    <small>
                      {formatDateTime(h.occurredAt)} · {h.actorName}
                    </small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={cancel}
        onOpenChange={setCancel}
        title="Hủy lịch hẹn?"
        description={`${a.code} · ${a.patientName}`}
        reason
        danger
        actionLabel="Hủy lịch hẹn"
        onConfirm={(reason) => action("cancel", reason)}
      />
      <ConfirmDialog
        open={noShow}
        onOpenChange={setNoShow}
        title="Ghi nhận bệnh nhân vắng hẹn?"
        description={`${a.code} · ${a.patientName}`}
        danger
        actionLabel="Xác nhận vắng hẹn"
        onConfirm={() => action("no-show")}
      >
        <p className="text-sm">
          Lịch hẹn sẽ chuyển sang trạng thái vắng hẹn và không thể tiếp nhận lại.
        </p>
      </ConfirmDialog>
    </>
  );
}
