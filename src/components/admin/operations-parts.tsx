"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
const CapacityChart = dynamic(() => import("./capacity-chart").then((m) => m.CapacityChart), {
  loading: () => <p>Đang tải biểu đồ…</p>,
});
import { api, allOptions, queryString } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { vietnamDate } from "@/lib/outpatient";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  ButtonLink,
  Card,
  Pager,
  Field,
  SelectInput,
  TextInput,
  TextArea,
  Checkbox,
  Form,
  Notice,
} from "@/components/ui";
import { Dialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";
import { useEventStream } from "@/hooks/use-event-stream";

type Ref = { id: number; name: string };
type DoctorRef = { id: number; fullName: string };
type OpsFilter = {
  from: string;
  to: string;
  departmentId: string;
  doctorId: string;
  roomId: string;
  serviceId: string;
};
function OperationsFilters({
  filters,
  onChange,
  capacity = false,
}: {
  filters: OpsFilter;
  onChange: (next: OpsFilter) => void;
  capacity?: boolean;
}) {
  const me = useUser();
  const admin = me.data?.roles.includes("ADMIN");
  const departments = useQuery({
    queryKey: ["operations-departments"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Ref>("/api/v1/catalog/departments", { signal }),
  });
  const doctors = useQuery({
    queryKey: ["staff-doctor-references"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<DoctorRef[]>("/api/v1/schedules/doctors", { signal }),
  });
  const rooms = useQuery({
    queryKey: ["operations-rooms"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Ref>("/api/v1/catalog/rooms?roomType=CLINIC", { signal }),
  });
  const services = useQuery({
    queryKey: ["operations-services"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Ref>("/api/v1/catalog/services?category=EXAMINATION", { signal }),
    enabled: capacity,
  });
  return (
    <div className="flex flex-wrap gap-3">
      <Field label="Từ ngày">
        <TextInput
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
      </Field>
      <Field label="Đến ngày">
        <TextInput
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
      </Field>
      {capacity && (
        <>
          <Button
            variant="ghost"
            onClick={() => onChange({ ...filters, from: vietnamDate(-6), to: vietnamDate() })}
          >
            7 ngày
          </Button>
          <Button
            variant="ghost"
            onClick={() => onChange({ ...filters, from: vietnamDate(-29), to: vietnamDate() })}
          >
            30 ngày
          </Button>
        </>
      )}
      {(
        [
          ["departmentId", "Khoa", departments.data],
          ["roomId", "Phòng", rooms.data],
          ["serviceId", "Dịch vụ", capacity ? services.data : undefined],
        ] as const
      ).map(
        ([key, label, items]) =>
          (key !== "serviceId" || capacity) && (
            <Field key={key} label={label}>
              <SelectInput
                value={filters[key]}
                onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
              >
                <option value="">Tất cả</option>
                {items?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ),
      )}
      {(admin || me.data?.roles.includes("RECEPTIONIST")) && (
        <Field label="Bác sĩ">
          <SelectInput
            value={filters.doctorId}
            onChange={(e) => onChange({ ...filters, doctorId: e.target.value })}
          >
            <option value="">Tất cả</option>
            {doctors.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
    </div>
  );
}
export const stages: Record<string, string> = {
  PAYMENT: "Chờ thu phí khám",
  DOCTOR: "Chờ bác sĩ",
  EXAMINING: "Đang khám",
  DIAGNOSTICS: "Chờ cận lâm sàng",
  REVIEW: "Chờ bác sĩ xem kết quả",
};
type Bottleneck = {
  encounterId: number;
  appointmentId: number;
  appointmentCode: string;
  patientName: string;
  doctorName: string;
  roomName: string;
  stage: string;
  waitingSeconds: number | null;
  insufficientHistory: boolean;
  breached: boolean;
  href: string;
  diagnostics: { orderId: number; serviceName: string; phase: string }[];
};
type Bottlenecks = {
  checkedAt: string;
  encounters: Bottleneck[];
  stages: {
    stage: string;
    count: number;
    breached: number;
    medianSeconds: number | null;
    p90Seconds: number | null;
  }[];
};
const minutes = (value: number | null) =>
  value === null ? "Không đủ dữ liệu" : `${Math.round(value / 60)} phút`;
export function BottleneckPanel({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState<OpsFilter>({
    from: vietnamDate(),
    to: vietnamDate(),
    departmentId: "",
    doctorId: "",
    roomId: "",
    serviceId: "",
  });
  const cache = useQueryClient();
  const me = useUser();
  const manager = me.data?.roles.includes("ADMIN");
  const q = useQuery({
    queryKey: ["bottlenecks", me.data?.id, filter],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Bottlenecks>(`/api/v1/dashboard/bottlenecks${queryString(filter)}`, { signal }),
    refetchInterval: 30000,
  });
  useEventStream("/api/v1/realtime/stream", () => {
    void cache.invalidateQueries({ queryKey: ["bottlenecks"] });
  });
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Tiến độ lượt khám và điểm nghẽn</h2>
      {!compact && <OperationsFilters filters={filter} onChange={setFilter} />}
      <QueryState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {q.data?.stages.map((s) => (
          <div key={s.stage} className="border border-line rounded p-3">
            <strong>{stages[s.stage]}</strong>
            <p>
              {s.count} lượt · vượt ngưỡng {s.breached}
            </p>
            <p className="text-xs">
              Trung vị {minutes(s.medianSeconds)} · P90 {minutes(s.p90Seconds)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Thời gian hiện đang ở mỗi bước. Dữ liệu thiếu mốc chuyển bước không được tính vào trung
        vị/P90.
      </p>
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Lượt khám</TableHead>
              <TableHead>Bác sĩ / phòng</TableHead>
              <TableHead>Bước hiện tại</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Cận lâm sàng</TableHead>
              <TableHead>Xử lý</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.encounters.map((r) => (
              <TableRow key={r.encounterId}>
                <TableCell>
                  {r.patientName}
                  <br />
                  {r.appointmentCode}
                </TableCell>
                <TableCell>
                  {r.doctorName}
                  <br />
                  {r.roomName}
                </TableCell>
                <TableCell>{stages[r.stage]}</TableCell>
                <TableCell>
                  {minutes(r.waitingSeconds)}
                  {r.breached && <strong className="text-danger"> · Vượt ngưỡng</strong>}
                </TableCell>
                <TableCell>
                  {r.diagnostics.map((d) => (
                    <p key={d.orderId}>
                      {d.serviceName}:{" "}
                      {(
                        {
                          UNPAID: "Chưa thanh toán",
                          UNACCEPTED: "Chưa tiếp nhận",
                          IN_PROGRESS: "Đang thực hiện",
                          COMPLETED: "Đã công bố",
                          CANCELLED: "Đã hủy",
                        } as Record<string, string>
                      )[d.phase] || d.phase}
                    </p>
                  ))}
                </TableCell>
                <TableCell>
                  <Link
                    className="underline"
                    href={
                      manager
                        ? "/staff/appointments-overview"
                        : me.data?.roles.includes("DOCTOR")
                          ? `/staff/encounters/${r.encounterId}`
                          : "/staff/appointments"
                    }
                  >
                    Mở lượt khám
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {q.data?.encounters.length === 0 && <p>Không có lượt đang chờ trong khoảng chọn.</p>}
    </Card>
  );
}
type CapacityRow = {
  doctorId: number;
  doctorName: string;
  roomId: number;
  roomName: string;
  serviceName: string;
  day: string;
  hour: number;
  opened: number;
  serving: number;
  closed: number;
  booked: number;
  free: number;
  checkedIn: number;
  examined: number;
  openedMinutes: number;
  bookedMinutes: number;
  occupancy: number | null;
  examinationRate: number | null;
  roomScheduleUtilization: number | null;
  insufficientHistory: boolean;
};
export function CapacityPanel() {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<OpsFilter>({
    from: vietnamDate(-6),
    to: vietnamDate(),
    departmentId: "",
    doctorId: "",
    roomId: "",
    serviceId: "",
  });
  const me = useUser();
  const q = useQuery({
    queryKey: ["capacity", me.data?.id, filter],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ rows: CapacityRow[] }>(`/api/v1/reports/capacity${queryString(filter)}`, { signal }),
  });
  const percent = (v: number | null) => (v === null ? "Chưa có lịch" : `${v.toFixed(1)}%`);
  const totalPages = Math.ceil((q.data?.rows.length ?? 0) / 25);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const visibleRows = q.data?.rows.slice(currentPage * 25, (currentPage + 1) * 25) ?? [];
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Công suất bác sĩ và lịch phòng</h2>
      <OperationsFilters
        filters={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(0);
        }}
        capacity
      />
      <ButtonLink variant="ghost" href={`/api/v1/reports/capacity.csv${queryString(filter)}`}>
        Xuất CSV cùng bộ lọc
      </ButtonLink>
      <QueryState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />
      {q.data?.rows.some((r) => r.insufficientHistory) && (
        <Notice>
          Lịch cũ chỉ có trạng thái nền tại thời điểm nâng cấp. Những dòng thiếu lịch sử không đủ để
          kết luận công suất quá khứ.
        </Notice>
      )}
      <p className="text-xs text-muted">
        Lấp lịch = lịch hẹn hợp lệ / chỗ phục vụ. Thực khám = lượt bắt đầu khám / chỗ phục vụ. Mức
        sử dụng lịch phòng = phút đặt / phút mở.
      </p>
      {q.data && q.data.rows.length > 0 && (
        <div className="h-64" aria-label="Biểu đồ công suất theo giờ">
          <CapacityChart
            data={q.data.rows
              .filter((r) => !r.insufficientHistory)
              .map((r) => ({
                label: `${r.day} ${r.hour}h · ${r.doctorName}`,
                serving: r.serving,
                booked: r.booked,
                examined: r.examined,
              }))}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Ngày / giờ</TableHead>
              <TableHead>Bác sĩ / phòng</TableHead>
              <TableHead>Mở / phục vụ / đóng</TableHead>
              <TableHead>Hẹn / trống</TableHead>
              <TableHead>Tiếp nhận / thực khám</TableHead>
              <TableHead>Lấp lịch / thực khám</TableHead>
              <TableHead>Lịch phòng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  {r.day} · {r.hour}h{r.insufficientHistory && " · thiếu lịch sử"}
                </TableCell>
                <TableCell>
                  {r.doctorName}
                  <br />
                  {r.roomName} · {r.serviceName}
                </TableCell>
                <TableCell>
                  {r.opened} / {r.serving} / {r.closed}
                </TableCell>
                <TableCell>
                  {r.insufficientHistory ? "Không đủ dữ liệu" : `${r.booked} / ${r.free}`}
                </TableCell>
                <TableCell>
                  {r.insufficientHistory ? "Không đủ dữ liệu" : `${r.checkedIn} / ${r.examined}`}
                </TableCell>
                <TableCell>
                  {r.insufficientHistory
                    ? "Không đủ dữ liệu"
                    : `${percent(r.occupancy)} / ${percent(r.examinationRate)}`}
                </TableCell>
                <TableCell>
                  {r.insufficientHistory
                    ? "Không đủ dữ liệu"
                    : `${r.bookedMinutes}/${r.openedMinutes} phút · ${percent(r.roomScheduleUtilization)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {q.data?.rows.length === 0 && <p>Chưa có lịch trong khoảng chọn.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{q.data?.rows.length ?? 0} dòng · 25 dòng mỗi trang</p>
        <Pager page={currentPage} totalPages={totalPages} onPage={setPage} />
      </div>
    </Card>
  );
}
export function WaitThresholdSettings() {
  const [draft, setDraft] = useState<{
    paymentMinutes: number;
    doctorMinutes: number;
    diagnosticMinutes: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const q = useQuery({
    queryKey: ["wait-thresholds"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ paymentMinutes: number; doctorMinutes: number; diagnosticMinutes: number }>(
        "/api/v1/clinic-settings/wait-thresholds",
        { signal },
      ),
  });
  const form = draft ?? q.data;
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Ngưỡng thời gian chờ</h2>
      <QueryState loading={q.isLoading} error={q.error} />
      {form && (
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            void api("/api/v1/clinic-settings/wait-thresholds", {
              method: "PUT",
              body: JSON.stringify(form),
            })
              .then(() => {
                setMessage("Đã lưu ngưỡng chờ.");
                setDraft(null);
                void q.refetch();
              })
              .catch((e) => setMessage(e.message));
          }}
          className="flex flex-wrap gap-3"
        >
          {(
            [
              ["paymentMinutes", "Thu phí khám"],
              ["doctorMinutes", "Chờ bác sĩ / xem kết quả"],
              ["diagnosticMinutes", "Cận lâm sàng"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={`${label} (phút)`}>
              <TextInput
                type="number"
                min={1}
                max={1440}
                required
                value={form[key]}
                onChange={(e) => setDraft({ ...form, [key]: Number(e.target.value) })}
              />
            </Field>
          ))}
          <Button type="submit">Lưu ngưỡng</Button>
        </Form>
      )}
      {message && <Notice>{message}</Notice>}
    </Card>
  );
}

type Impact = {
  slotId: number;
  startsAt: string;
  slotStatus: string;
  appointmentId: number | null;
  appointmentCode: string | null;
  patientName: string | null;
  appointmentStatus: string | null;
  separateHandling: boolean;
};
type Absence = {
  id: number;
  doctorName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  actorName: string;
  pending: number;
  rescheduled: number;
  cancelled: number;
};
type Coordination = {
  appointmentId: number;
  absenceId: number;
  appointmentCode: string;
  patientName: string;
  oldStartsAt: string;
  doctorName: string;
  contactStatus: string;
  contactNote: string | null;
  resolution: string;
  revision: number;
  agreedAt: string | null;
  agreedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  paymentReviewRequired: boolean;
};
type Candidate = {
  slotId: number;
  doctorName: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  occupancy: number;
};
const contacts: Record<string, string> = {
  NOT_CONTACTED: "Chưa liên hệ",
  UNREACHABLE: "Chưa liên hệ được",
  CHOOSING: "Đang lựa chọn",
  AGREED: "Đã thống nhất",
};
export function AbsenceCoordinationPanel({
  admin = false,
  allowCreate = false,
}: {
  admin?: boolean;
  allowCreate?: boolean;
}) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState({ doctorId: "", startsAt: "", endsAt: "", reason: "" });
  const [preview, setPreview] = useState<Impact[] | null>(null);
  const [previewHash, setPreviewHash] = useState("");
  const [requestId, setRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [absenceId, setAbsenceId] = useState("");
  const [selected, setSelected] = useState<Coordination | null>(null);
  const [contact, setContact] = useState({ status: "NOT_CONTACTED", note: "" });
  const [days, setDays] = useState(7);
  const [slot, setSlot] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [finalRequest, setFinalRequest] = useState("");
  const doctors = useQuery({
    queryKey: ["staff-doctor-references"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<DoctorRef[]>("/api/v1/schedules/doctors", { signal }),
    enabled: admin,
  });
  const absences = useQuery({
    queryKey: ["doctor-absences"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Absence[]>("/api/v1/schedules/absences", { signal }),
    refetchInterval: 30000,
  });
  const list = useQuery({
    queryKey: ["appointment-coordination", absenceId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Coordination[]>(`/api/v1/schedules/absences/coordination${queryString({ absenceId })}`, {
        signal,
      }),
    refetchInterval: 30000,
  });
  const candidates = useQuery({
    queryKey: ["replacement-candidates", selected?.appointmentId, days],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Candidate[]>(
        `/api/v1/schedules/absences/coordination/${selected!.appointmentId}/candidates?days=${days}`,
        { signal },
      ),
    enabled: !!selected && selected.resolution === "PENDING",
    refetchInterval: 30000,
  });
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      await invalidateDataGroups(cache, [
        "doctor-absences",
        "appointment-coordination",
        "replacement-candidates",
        "appointment",
        "slots",
        "managed-slots",
        "capacity",
        "reception-appointments",
        "doctor-queue",
        "bottlenecks",
        "dashboard-overview",
      ]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không cập nhật được điều phối.");
    } finally {
      setBusy(false);
    }
  }
  function choose(c: Coordination) {
    setSelected(c);
    setContact({ status: c.contactStatus, note: c.contactNote ?? "" });
    setSlot("");
    setAgreed(false);
    setCancelReason("");
    setFinalRequest(crypto.randomUUID());
  }
  const body = () => ({
    ...input,
    doctorId: Number(input.doctorId),
    startsAt: new Date(`${input.startsAt}:00+07:00`).toISOString(),
    endsAt: new Date(`${input.endsAt}:00+07:00`).toISOString(),
    requestId,
  });
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <h2 className="font-semibold">Điều phối lịch khi bác sĩ nghỉ</h2>
        {admin && allowCreate && (
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(true);
              setPreview(null);
              setRequestId(crypto.randomUUID());
            }}
          >
            Ghi nhận nghỉ đột xuất
          </Button>
        )}
      </div>
      {message && <Notice>{message}</Notice>}
      <Field label="Đợt nghỉ">
        <SelectInput value={absenceId} onChange={(e) => setAbsenceId(e.target.value)}>
          <option value="">Tất cả đợt nghỉ</option>
          {absences.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.doctorName} · {formatDateTime(a.startsAt)}
            </option>
          ))}
        </SelectInput>
      </Field>
      <QueryState
        loading={absences.isLoading || list.isLoading}
        error={absences.error || list.error}
        retry={() =>
          void invalidateDataGroups(cache, [
            "doctor-absences",
            "appointment-coordination",
            "replacement-candidates",
            "appointment",
            "slots",
            "managed-slots",
            "capacity",
            "reception-appointments",
            "doctor-queue",
            "bottlenecks",
            "dashboard-overview",
          ])
        }
      />
      {absences.data
        ?.filter((a) => !absenceId || a.id === Number(absenceId))
        .map((a) => (
          <p key={a.id}>
            {a.doctorName}: {formatDateTime(a.startsAt)} – {formatDateTime(a.endsAt)} · chưa xử lý{" "}
            {a.pending} · đã đổi {a.rescheduled} · đã hủy {a.cancelled} · {a.actorName}
          </p>
        ))}
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Lịch bị ảnh hưởng</TableHead>
              <TableHead>Liên hệ</TableHead>
              <TableHead>Xử lý</TableHead>
              <TableHead>Người thao tác</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.map((c) => (
              <TableRow key={`${c.absenceId}:${c.appointmentId}`}>
                <TableCell>
                  {c.patientName} · {c.appointmentCode}
                  <br />
                  {formatDateTime(c.oldStartsAt)} · {c.doctorName}
                </TableCell>
                <TableCell>
                  {contacts[c.contactStatus]}
                  <br />
                  {c.contactNote}
                </TableCell>
                <TableCell>
                  {
                    (
                      {
                        PENDING: "Chờ xử lý",
                        RESCHEDULED: "Đã đổi",
                        CANCELLED: "Đã hủy",
                      } as Record<string, string>
                    )[c.resolution]
                  }
                </TableCell>
                <TableCell>
                  {c.resolvedBy || c.agreedBy || "—"}
                  <br />
                  {formatDateTime(c.resolvedAt || c.agreedAt)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" onClick={() => choose(c)}>
                    {admin ? "Xem" : "Liên hệ / đổi lịch"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.data?.length === 0 && <p>Chưa có lịch cần điều phối.</p>}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Ghi nhận bác sĩ nghỉ đột xuất"
        busy={busy}
        dirty={!!input.reason}
      >
        <Form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const data = await api<Impact[]>("/api/v1/schedules/absences/preview", {
                method: "POST",
                body: JSON.stringify(body()),
              });
              setPreview(data);
              setPreviewHash(JSON.stringify(input));
            });
          }}
        >
          <Field label="Bác sĩ">
            <SelectInput
              required
              value={input.doctorId}
              onChange={(e) => setInput({ ...input, doctorId: e.target.value })}
            >
              <option value="">Chọn bác sĩ</option>
              {doctors.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bắt đầu nghỉ (giờ Việt Nam)">
            <TextInput
              required
              type="datetime-local"
              value={input.startsAt}
              onChange={(e) => setInput({ ...input, startsAt: e.target.value })}
            />
          </Field>
          <Field label="Kết thúc nghỉ (giờ Việt Nam)">
            <TextInput
              required
              type="datetime-local"
              value={input.endsAt}
              onChange={(e) => setInput({ ...input, endsAt: e.target.value })}
            />
          </Field>
          <Field label="Lý do">
            <TextArea
              required
              maxLength={500}
              value={input.reason}
              onChange={(e) => setInput({ ...input, reason: e.target.value })}
            />
          </Field>
          <Button type="submit" busy={busy}>
            Xem trước ảnh hưởng
          </Button>
        </Form>
        {preview && previewHash === JSON.stringify(input) && (
          <div className="space-y-3 mt-3">
            {preview.map((p, i) => (
              <p key={i}>
                {formatDateTime(p.startsAt)} · {p.patientName || "Chưa có lịch hẹn"} ·{" "}
                {p.appointmentCode}{" "}
                {p.separateHandling
                  ? "· Cần xử lý riêng; không tự chuyển bác sĩ"
                  : "· Đóng khung giờ / cần đổi lịch"}
              </p>
            ))}
            <Button
              busy={busy}
              onClick={() =>
                void run(async () => {
                  await api("/api/v1/schedules/absences", {
                    method: "POST",
                    body: JSON.stringify(body()),
                  });
                  setOpen(false);
                  setMessage("Đã ghi nhận nghỉ. Lễ tân liên hệ bệnh nhân để chốt lịch thay thế.");
                })
              }
            >
              Xác nhận đợt nghỉ
            </Button>
          </div>
        )}
        {message && <Notice>{message}</Notice>}
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={`Điều phối: ${selected?.patientName ?? ""}`}
        busy={busy}
      >
        <div className="space-y-3">
          {selected && (
            <>
              <p>
                {selected.appointmentCode} · {formatDateTime(selected.oldStartsAt)}
              </p>
              {selected.paymentReviewRequired && (
                <Notice>
                  Có thanh toán cần đối chiếu. Chuyển thu ngân xử lý trước khi chốt đổi lịch.
                </Notice>
              )}
              {!admin && selected.resolution === "PENDING" && (
                <Form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      const c = await api<Coordination>(
                        `/api/v1/schedules/absences/coordination/${selected.appointmentId}/contact`,
                        {
                          method: "PUT",
                          body: JSON.stringify({ ...contact, revision: selected.revision }),
                        },
                      );
                      setSelected(c);
                    });
                  }}
                  className="space-y-3"
                >
                  <Field label="Tình trạng liên hệ">
                    <SelectInput
                      value={contact.status}
                      onChange={(e) => setContact({ ...contact, status: e.target.value })}
                    >
                      {Object.entries(contacts).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Ghi nhận liên hệ / nội dung đã thống nhất">
                    <TextArea
                      maxLength={1000}
                      required={contact.status === "AGREED"}
                      value={contact.note}
                      onChange={(e) => setContact({ ...contact, note: e.target.value })}
                    />
                  </Field>
                  <Button type="submit" busy={busy}>
                    Lưu liên hệ
                  </Button>
                </Form>
              )}
              <Field label="Tìm phương án trong">
                <SelectInput value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={7}>7 ngày tới</option>
                  <option value={30}>30 ngày tới</option>
                </SelectInput>
              </Field>
              <QueryState
                loading={candidates.isLoading && selected.resolution === "PENDING"}
                error={candidates.error}
                retry={() => void candidates.refetch()}
              />
              <Field label="Lịch thay thế cùng dịch vụ và chuyên khoa">
                <SelectInput
                  value={slot}
                  onChange={(e) => {
                    setSlot(e.target.value);
                    setAgreed(false);
                    setFinalRequest(crypto.randomUUID());
                  }}
                >
                  <option value="">Chọn phương án</option>
                  {candidates.data?.map((c) => (
                    <option key={c.slotId} value={c.slotId}>
                      {formatDateTime(c.startsAt)} · {c.doctorName} · {c.roomName} · {c.serviceName}{" "}
                      · lấp lịch {(c.occupancy * 100).toFixed(0)}%
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {candidates.data?.length === 0 && <p>Chưa tìm được chỗ phù hợp trong khoảng chọn.</p>}
              {!admin && selected.resolution === "PENDING" && (
                <>
                  <Checkbox
                    label="Bệnh nhân đồng ý với phương án đang chọn"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <Button
                    busy={busy}
                    disabled={
                      !slot ||
                      !agreed ||
                      selected.contactStatus !== "AGREED" ||
                      selected.paymentReviewRequired
                    }
                    onClick={() =>
                      void run(async () => {
                        await api(
                          `/api/v1/schedules/absences/coordination/${selected.appointmentId}/finalize`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              revision: selected.revision,
                              slotId: Number(slot),
                              patientAgreed: agreed,
                              requestId: finalRequest,
                            }),
                          },
                        );
                        setSelected(null);
                        setMessage("Đã đổi lịch, giữ giá công khám đã chốt.");
                      })
                    }
                  >
                    Chốt lịch thay thế
                  </Button>
                  <Field label="Lý do hủy nếu bệnh nhân từ chối các phương án">
                    <TextArea
                      maxLength={500}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </Field>
                  <Button
                    variant="danger"
                    disabled={!cancelReason.trim()}
                    busy={busy}
                    onClick={() =>
                      void run(async () => {
                        await api(`/api/v1/appointments/${selected.appointmentId}/cancel`, {
                          method: "POST",
                          body: JSON.stringify({ reason: cancelReason }),
                        });
                        setSelected(null);
                      })
                    }
                  >
                    Hủy theo yêu cầu bệnh nhân
                  </Button>
                </>
              )}
            </>
          )}
          {message && <Notice>{message}</Notice>}
        </div>
      </Dialog>
    </Card>
  );
}
