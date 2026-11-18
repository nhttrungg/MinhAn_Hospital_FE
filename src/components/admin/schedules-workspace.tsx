"use client";
import { invalidateDataGroups } from "@/lib/query-cache";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DetailList, PageHeader } from "@/components/ui/data-display";
import { ConfirmDialog, Dialog, DialogClose, RowMenu, MenuItem } from "@/components/ui/overlays";
import { ApiError, api, queryString, allOptions } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type {
  Appointment,
  ClinicalService,
  CurrentUser,
  Doctor,
  PageResult,
  Room,
  Slot,
  StaffAccount,
} from "@/lib/types";
import {
  Button,
  Card,
  Field,
  Notice,
  Pager,
  SelectInput,
  TextInput,
  TextArea,
  Form,
} from "@/components/ui";

import { vietnamDate } from "@/lib/outpatient";
import { QueryState } from "@/components/workspace-ui";
import { CapacityPanel, AbsenceCoordinationPanel } from "./operations-parts";

const statusLabel: Record<string, string> = {
  DRAFT: "Nháp",
  SUBMITTED: "Chờ duyệt",
  PUBLISHED: "Đã công bố",
  REJECTED: "Bị từ chối",
  CLOSE_REQUESTED: "Chờ duyệt nghỉ",
  CLOSED: "Đã đóng",
};
type WeeklyTemplate = {
  id: number;
  weekday: number;
  startsTime: string;
  endsTime: string;
  roomId: number;
  serviceId: number;
  active: boolean;
};
const weekdays = ["", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];

function vietnamInstant(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}

export function SchedulesWorkspace() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ roomId: 0, serviceId: 0, startsAt: "", endsAt: "", note: "" });
  const [templateForm, setTemplateForm] = useState({
    weekday: 1,
    startsTime: "10:20",
    endsTime: "11:20",
    roomId: 0,
    serviceId: 0,
  });
  const [generateRange, setGenerateRange] = useState({ from: "", to: "" });
  const [editId, setEditId] = useState(0);
  const [templateEditId, setTemplateEditId] = useState(0);
  const [filter, setFilter] = useState({
    from: vietnamDate(-30),
    to: vietnamDate(30),
    doctorId: "",
    status: "",
    page: 0,
  });
  const [modal, setModal] = useState<"slot" | "template" | "detail" | "generate" | "copy" | null>(
    null,
  );
  const [selected, setSelected] = useState<Slot | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WeeklyTemplate | null>(null);
  const [copyDates, setCopyDates] = useState("");
  const [initial, setInitial] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    danger?: boolean;
    reason?: boolean;
    label: string;
    run: (reason: string) => Promise<void>;
  } | null>(null);
  const [success, setSuccess] = useState("");
  const [affectedSlot, setAffectedSlot] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<CurrentUser>("/api/v1/auth/me", { signal }),
  });
  const self = useQuery({
    queryKey: ["staff-me", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<StaffAccount>("/api/v1/staff-accounts/me", { signal }),
    enabled: me.data?.roles.includes("DOCTOR") ?? false,
  });
  const doctors = useQuery({
    queryKey: ["staff-doctor-references"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Pick<Doctor, "id" | "fullName">[]>("/api/v1/schedules/doctors", { signal }),
  });
  const rooms = useQuery({
    queryKey: ["rooms", "clinic"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Room>("/api/v1/catalog/rooms?roomType=CLINIC&active=true", { signal }),
  });
  const slots = useQuery({
    queryKey: ["managed-slots", filter],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Slot>>(`/api/v1/schedules/search${queryString({ ...filter, size: 20 })}`, {
        signal,
      }),
    enabled: me.data?.roles.some((role) => role === "DOCTOR" || role === "ADMIN") ?? false,
  });
  const templates = useQuery({
    queryKey: ["weekly-templates", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<WeeklyTemplate[]>("/api/v1/schedules/templates", { signal }),
    enabled: me.data?.roles.includes("DOCTOR") ?? false,
  });
  const affected = useQuery({
    queryKey: ["affected", affectedSlot],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Appointment[]>(`/api/v1/schedules/slots/${affectedSlot}/affected-appointments`, {
        signal,
      }),
    enabled: (me.data?.roles.includes("ADMIN") ?? false) && affectedSlot > 0,
  });
  const doctor = me.data?.roles.includes("DOCTOR") ?? false;
  const admin = me.data?.roles.includes("ADMIN") ?? false;
  const directory = useQuery({
    queryKey: ["services", "schedule"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<ClinicalService>("/api/v1/catalog/services?category=EXAMINATION", { signal }),
    enabled: doctor,
  });
  const services = (directory.data ?? []).filter(
    (item) =>
      self.data?.serviceIds.includes(item.id) &&
      (item.active || item.id === form.serviceId || item.id === templateForm.serviceId),
  );

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<Slot>(editId ? `/api/v1/schedules/slots/${editId}` : "/api/v1/schedules/slots", {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify({
          roomId: form.roomId,
          serviceId: form.serviceId,
          startsAt: vietnamInstant(form.startsAt),
          endsAt: vietnamInstant(form.endsAt),
          note: form.note,
        }),
      });
      setForm({ ...form, startsAt: "", endsAt: "", note: "" });
      setEditId(0);
      setModal(null);
      setSuccess("Đã lưu lịch nháp.");
      await invalidateDataGroups(queryClient, [
        "managed-slots",
        "slots",
        "public-doctor-availability",
        "weekly-templates",
        "affected",
        "capacity",
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "dashboard-overview",
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được khoảng khám.");
    } finally {
      setBusy(false);
    }
  }

  async function action(
    slot: Slot,
    operation: "submit" | "approve" | "reject" | "request-close" | "approve-close" | "reject-close",
    reason?: string,
  ) {
    setBusy(true);
    setError("");
    try {
      await api<Slot>(`/api/v1/schedules/slots/${slot.id}/${operation}`, {
        method: "POST",
        ...(reason ? { body: JSON.stringify({ reason }) } : {}),
      });
      await invalidateDataGroups(queryClient, [
        "managed-slots",
        "slots",
        "public-doctor-availability",
        "weekly-templates",
        "affected",
        "capacity",
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "dashboard-overview",
      ]);

      setAffectedSlot(0);
      setSuccess("Đã cập nhật trạng thái lịch.");
    } catch (cause) {
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<WeeklyTemplate>(
        templateEditId
          ? `/api/v1/schedules/templates/${templateEditId}`
          : "/api/v1/schedules/templates",
        { method: templateEditId ? "PUT" : "POST", body: JSON.stringify(templateForm) },
      );
      setTemplateEditId(0);
      setModal(null);
      setSuccess("Đã lưu mẫu tuần.");
      await queryClient.invalidateQueries({ queryKey: ["weekly-templates", me.data?.id] });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không lưu được mẫu tuần.");
    } finally {
      setBusy(false);
    }
  }

  async function generate(id: number) {
    if (!generateRange.from || !generateRange.to) {
      setError("Chọn ngày đầu và cuối trước khi tạo từ mẫu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api<Slot[]>(`/api/v1/schedules/templates/${id}/generate`, {
        method: "POST",
        body: JSON.stringify(generateRange),
      });
      await invalidateDataGroups(queryClient, [
        "managed-slots",
        "slots",
        "public-doctor-availability",
        "weekly-templates",
        "affected",
        "capacity",
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "dashboard-overview",
      ]);
      setModal(null);
      setSuccess("Đã tạo lịch nháp từ mẫu tuần.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không tạo được khoảng từ mẫu.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(slot: Slot) {
    const dates = copyDates
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!dates.length || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      setError("Nhập ngày theo định dạng YYYY-MM-DD, cách nhau bằng dấu phẩy.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api<Slot[]>(`/api/v1/schedules/slots/${slot.id}/copy`, {
        method: "POST",
        body: JSON.stringify({ dates }),
      });
      await invalidateDataGroups(queryClient, [
        "managed-slots",
        "slots",
        "public-doctor-availability",
        "weekly-templates",
        "affected",
        "capacity",
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "dashboard-overview",
      ]);
      setModal(null);
      setSuccess("Đã sao chép lịch nháp.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không sao chép được lịch.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, template = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/schedules/${template ? "templates" : "slots"}/${id}`, {
        method: "DELETE",
      });
      await invalidateDataGroups(queryClient, [
        "managed-slots",
        "slots",
        "public-doctor-availability",
        "weekly-templates",
        "affected",
        "capacity",
        "appointment",
        "reception-appointments",
        "doctor-queue",
        "dashboard-overview",
      ]);
      setSuccess(template ? "Đã ngưng mẫu tuần." : "Đã xóa lịch nháp.");
    } catch (cause) {
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  function edit(slot: Slot) {
    const local = (value: string) =>
      new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
    setEditId(slot.id);
    setForm({
      roomId: slot.roomId,
      serviceId: slot.serviceId,
      startsAt: local(slot.startsAt),
      endsAt: local(slot.endsAt),
      note: slot.note ?? "",
    });
    setInitial(
      JSON.stringify({
        roomId: slot.roomId,
        serviceId: slot.serviceId,
        startsAt: local(slot.startsAt),
        endsAt: local(slot.endsAt),
        note: slot.note ?? "",
      }),
    );
    setError("");
    setModal("slot");
  }
  function createSlot() {
    const next = { roomId: 0, serviceId: 0, startsAt: "", endsAt: "", note: "" };
    setForm(next);
    setEditId(0);
    setInitial(JSON.stringify(next));
    setError("");
    setModal("slot");
  }
  function editTemplate(template?: WeeklyTemplate) {
    const next = template
      ? {
          weekday: template.weekday,
          startsTime: template.startsTime,
          endsTime: template.endsTime,
          roomId: template.roomId,
          serviceId: template.serviceId,
        }
      : { weekday: 1, startsTime: "10:20", endsTime: "11:20", roomId: 0, serviceId: 0 };
    setTemplateForm(next);
    setTemplateEditId(template?.id ?? 0);
    setInitial(JSON.stringify(next));
    setError("");
    setModal("template");
  }
  function view(slot: Slot) {
    setSelected(slot);
    setAffectedSlot(admin && slot.status === "CLOSE_REQUESTED" ? slot.id : 0);
    setError("");
    setModal("detail");
  }
  function confirmAction(
    slot: Slot,
    operation: "submit" | "approve" | "reject" | "request-close" | "approve-close" | "reject-close",
    label: string,
  ) {
    setConfirmation({
      title: `${label}?`,
      description: `${slot.doctorName} · ${formatDateTime(slot.startsAt)}`,
      label,
      reason: operation === "reject" || operation === "reject-close",
      danger: operation === "reject" || operation === "approve-close",
      run: (reason) => action(slot, operation, reason),
    });
  }
  const columns: ColumnDef<Slot>[] = [
    {
      id: "doctor",
      header: "Bác sĩ / dịch vụ",
      size: 260,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            className="at-cell-name"
            type="button"
            onClick={() => view(row.original)}
          >
            {row.original.doctorName}
          </Button>
          <small>{row.original.serviceName}</small>
        </>
      ),
    },
    {
      id: "time",
      header: "Khoảng khám",
      size: 250,
      cell: ({ row }) => (
        <>
          {formatDateTime(row.original.startsAt)}
          <small>Đến {formatDateTime(row.original.endsAt)}</small>
        </>
      ),
    },
    { id: "room", header: "Phòng", size: 150, cell: ({ row }) => row.original.roomName },
    {
      id: "status",
      header: "Trạng thái",
      size: 140,
      cell: ({ row }) => (
        <span className="at-cell-tag">
          {statusLabel[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      size: 140,
      cell: ({ row }) => (
        <div className="at-catalog-row-actions">
          <Button variant="ghost" type="button" onClick={() => view(row.original)}>
            Xem
          </Button>
          <RowMenu label={`Thao tác lịch ${row.original.id}`}>
            <MenuItem onSelect={() => view(row.original)}>Xem chi tiết</MenuItem>
            {slotActions(row.original)}
          </RowMenu>
        </div>
      ),
    },
  ];
  function slotActions(slot: Slot) {
    return (
      <>
        {doctor && ["DRAFT", "REJECTED"].includes(slot.status) && (
          <>
            <MenuItem onSelect={() => edit(slot)}>Sửa lịch nháp</MenuItem>
            <MenuItem onSelect={() => confirmAction(slot, "submit", "Gửi duyệt")}>
              Gửi duyệt
            </MenuItem>
            <MenuItem
              danger
              onSelect={() =>
                setConfirmation({
                  title: "Xóa lịch nháp?",
                  description: formatDateTime(slot.startsAt),
                  label: "Xóa lịch nháp",
                  danger: true,
                  run: () => remove(slot.id),
                })
              }
            >
              Xóa lịch nháp
            </MenuItem>
          </>
        )}
        {doctor && slot.status === "PUBLISHED" && (
          <MenuItem onSelect={() => confirmAction(slot, "request-close", "Xin nghỉ / đóng lịch")}>
            Xin nghỉ / đóng lịch
          </MenuItem>
        )}
        {doctor && (
          <MenuItem
            onSelect={() => {
              setSelected(slot);
              setCopyDates("");
              setInitial("");
              setError("");
              setModal("copy");
            }}
          >
            Sao chép ngày
          </MenuItem>
        )}
        {admin && slot.status === "SUBMITTED" && (
          <>
            <MenuItem onSelect={() => confirmAction(slot, "approve", "Công bố lịch")}>
              Công bố
            </MenuItem>
            <MenuItem danger onSelect={() => confirmAction(slot, "reject", "Từ chối lịch")}>
              Từ chối
            </MenuItem>
          </>
        )}
        {admin && slot.status === "CLOSE_REQUESTED" && (
          <>
            <MenuItem onSelect={() => view(slot)}>Xem lịch bị ảnh hưởng</MenuItem>
            <MenuItem
              danger
              onSelect={() => confirmAction(slot, "approve-close", "Duyệt đóng và báo đổi lịch")}
            >
              Duyệt đóng và báo đổi lịch
            </MenuItem>
            <MenuItem onSelect={() => confirmAction(slot, "reject-close", "Từ chối nghỉ")}>
              Từ chối nghỉ
            </MenuItem>
          </>
        )}
      </>
    );
  }
  const templateColumns: ColumnDef<WeeklyTemplate>[] = [
    {
      id: "day",
      header: "Ngày trong tuần",
      size: 160,
      cell: ({ row }) => weekdays[row.original.weekday],
    },
    {
      id: "time",
      header: "Khoảng giờ",
      size: 160,
      cell: ({ row }) =>
        `${row.original.startsTime.slice(0, 5)}–${row.original.endsTime.slice(0, 5)}`,
    },
    {
      id: "room",
      header: "Phòng / dịch vụ",
      size: 300,
      cell: ({ row }) => (
        <>
          {rooms.data?.find((room) => room.id === row.original.roomId)?.name ??
            `Phòng #${row.original.roomId}`}
          <small>
            {directory.data?.find((service) => service.id === row.original.serviceId)?.name ??
              `Dịch vụ #${row.original.serviceId}`}
          </small>
        </>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      size: 230,
      cell: ({ row }) => (
        <div className="at-catalog-row-actions">
          <Button variant="ghost" type="button" onClick={() => editTemplate(row.original)}>
            Sửa
          </Button>
          <Button
            type="button"
            onClick={() => {
              setSelectedTemplate(row.original);
              setGenerateRange({ from: "", to: "" });
              setInitial(JSON.stringify({ from: "", to: "" }));
              setError("");
              setModal("generate");
            }}
          >
            Tạo lịch
          </Button>
          <RowMenu label={`Thao tác mẫu ${row.original.id}`}>
            <MenuItem
              danger
              onSelect={() =>
                setConfirmation({
                  title: "Ngưng mẫu tuần?",
                  description: `${weekdays[row.original.weekday]} · ${row.original.startsTime.slice(0, 5)}`,
                  label: "Ngưng mẫu",
                  danger: true,
                  run: () => remove(row.original.id, true),
                })
              }
            >
              Ngưng mẫu
            </MenuItem>
          </RowMenu>
        </div>
      ),
    },
  ];
  const currentSlot = slots.data?.content.find((slot) => slot.id === selected?.id) ?? selected;
  const dirty =
    modal === "slot"
      ? JSON.stringify(form) !== initial
      : modal === "template"
        ? JSON.stringify(templateForm) !== initial
        : modal === "copy"
          ? !!copyDates
          : modal === "generate"
            ? JSON.stringify(generateRange) !== initial
            : false;
  const titles = {
    slot: editId ? "Sửa lịch nháp" : "Tạo khoảng khám",
    template: templateEditId ? "Sửa mẫu tuần" : "Tạo mẫu tuần",
    detail: "Chi tiết lịch bác sĩ",
    generate: "Tạo lịch từ mẫu tuần",
    copy: "Sao chép lịch sang ngày khác",
  };
  return (
    <>
      {admin && <AbsenceCoordinationPanel admin allowCreate />}
      {(admin || doctor) && <CapacityPanel />}
      <PageHeader
        eyebrow="Vận hành"
        title="Lịch bác sĩ"
        description="Quản lý khoảng khám và duyệt lịch trước khi công bố."
        actions={
          doctor ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => editTemplate()}>
                Thêm mẫu tuần
              </Button>
              <Button type="button" onClick={createSlot}>
                Thêm khoảng khám
              </Button>
            </div>
          ) : undefined
        }
      />
      {success && <Notice>{success}</Notice>}
      {error && !modal && <Notice tone="error">{error}</Notice>}
      <QueryState loading={me.isLoading} error={me.error} retry={() => void me.refetch()} />
      {admin && (
        <QueryState
          loading={doctors.isLoading}
          error={doctors.error}
          retry={() => void doctors.refetch()}
        />
      )}
      <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Từ ngày">
          <TextInput
            type="date"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value, page: 0 })}
          />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value, page: 0 })}
          />
        </Field>
        {admin && (
          <Field label="Bác sĩ">
            <SelectInput
              value={filter.doctorId}
              onChange={(e) => setFilter({ ...filter, doctorId: e.target.value, page: 0 })}
            >
              <option value="">Tất cả</option>
              {doctors.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label="Trạng thái">
          <SelectInput
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 0 })}
          >
            <option value="">Tất cả</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>
      <QueryState
        loading={slots.isLoading}
        error={slots.error}
        retry={() => void slots.refetch()}
      />
      {slots.data && (
        <>
          <DataTable
            fitColumns
            className="at-catalog-table"
            data={slots.data.content}
            columns={columns}
          />
          <Pager
            page={filter.page}
            totalPages={slots.data.totalPages}
            totalElements={slots.data.totalElements}
            onPage={(page) => setFilter({ ...filter, page })}
          />
        </>
      )}
      {doctor && (
        <section className="space-y-4">
          <h2 className="font-semibold">Mẫu tuần</h2>
          <QueryState
            loading={templates.isLoading}
            error={templates.error}
            retry={() => void templates.refetch()}
          />
          {templates.data && (
            <DataTable
              fitColumns
              className="at-catalog-table"
              data={templates.data.filter((t) => t.active)}
              columns={templateColumns}
            />
          )}
        </section>
      )}
      <Dialog
        open={!!modal}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null);
            setAffectedSlot(0);
          }
        }}
        size="wide"
        title={modal ? titles[modal] : "Lịch bác sĩ"}
        description={
          modal === "detail" ? currentSlot?.doctorName : "Thời gian được tính theo giờ Việt Nam."
        }
        busy={busy}
        dirty={dirty}
        footer={
          <>
            <DialogClose>
              <Button type="button" variant="ghost" disabled={busy}>
                {modal === "detail" ? "Đóng" : "Hủy"}
              </Button>
            </DialogClose>
            {modal && modal !== "detail" && (
              <Button
                type="submit"
                form={`schedule-${modal}`}
                busy={busy}
                disabled={
                  (modal === "slot" || modal === "template") &&
                  (!self.data ||
                    !!rooms.error ||
                    !!directory.error ||
                    !(modal === "slot"
                      ? form.roomId && form.serviceId
                      : templateForm.roomId && templateForm.serviceId))
                }
              >
                {modal === "slot"
                  ? editId
                    ? "Lưu thay đổi"
                    : "Tạo lịch nháp"
                  : modal === "template"
                    ? "Lưu mẫu tuần"
                    : modal === "copy"
                      ? "Sao chép lịch"
                      : "Tạo lịch nháp"}
              </Button>
            )}
          </>
        }
      >
        {error && <Notice tone="error">{error}</Notice>}
        {(modal === "slot" || modal === "template") && (
          <>
            <QueryState
              loading={self.isLoading}
              error={self.error}
              retry={() => void self.refetch()}
            />
            <QueryState
              loading={rooms.isLoading}
              error={rooms.error}
              retry={() => void rooms.refetch()}
            />
            <QueryState
              loading={directory.isLoading}
              error={directory.error}
              retry={() => void directory.refetch()}
            />
          </>
        )}
        {modal === "slot" && (
          <Form id="schedule-slot" onSubmit={create} className="space-y-5">
            <section className="at-catalog-form-section">
              <h3 className="at-section-title">Thời gian và địa điểm</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bắt đầu" required>
                  <TextInput
                    type="datetime-local"
                    required
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </Field>
                <Field label="Kết thúc" required>
                  <TextInput
                    type="datetime-local"
                    min={form.startsAt || undefined}
                    required
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />
                </Field>
                <Field label="Phòng khám" required>
                  <SelectInput
                    required
                    value={form.roomId || ""}
                    onChange={(e) => setForm({ ...form, roomId: Number(e.target.value) })}
                  >
                    <option value="">Chọn phòng</option>
                    {rooms.data?.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Dịch vụ" required>
                  <SelectInput
                    required
                    value={form.serviceId || ""}
                    onChange={(e) => setForm({ ...form, serviceId: Number(e.target.value) })}
                  >
                    <option value="">Chọn dịch vụ</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
            </section>
            <section className="at-catalog-form-section">
              <Field label="Ghi chú">
                <TextArea
                  rows={4}
                  maxLength={500}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </Field>
            </section>
          </Form>
        )}
        {modal === "template" && (
          <Form
            id="schedule-template"
            onSubmit={createTemplate}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Field label="Ngày trong tuần">
                <SelectInput
                  value={templateForm.weekday}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, weekday: Number(e.target.value) })
                  }
                >
                  {weekdays.slice(1).map((day, index) => (
                    <option value={index + 1} key={day}>
                      {day}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Bắt đầu" required>
              <TextInput
                type="time"
                required
                value={templateForm.startsTime}
                onChange={(e) => setTemplateForm({ ...templateForm, startsTime: e.target.value })}
              />
            </Field>
            <Field label="Kết thúc" required>
              <TextInput
                type="time"
                min={templateForm.startsTime}
                required
                value={templateForm.endsTime}
                onChange={(e) => setTemplateForm({ ...templateForm, endsTime: e.target.value })}
              />
            </Field>
            <Field label="Phòng" required>
              <SelectInput
                required
                value={templateForm.roomId || ""}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, roomId: Number(e.target.value) })
                }
              >
                <option value="">Chọn phòng</option>
                {rooms.data?.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Dịch vụ" required>
              <SelectInput
                required
                value={templateForm.serviceId || ""}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, serviceId: Number(e.target.value) })
                }
              >
                <option value="">Chọn dịch vụ</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </Form>
        )}
        {modal === "generate" && (
          <Form
            id="schedule-generate"
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedTemplate) void generate(selectedTemplate.id);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Notice>
                Tạo lịch nháp từ mẫu {weekdays[selectedTemplate?.weekday ?? 1]}. Khoảng ngày tối đa
                31 ngày.
              </Notice>
            </div>
            <Field label="Từ ngày" required>
              <TextInput
                type="date"
                required
                value={generateRange.from}
                onChange={(e) => setGenerateRange({ ...generateRange, from: e.target.value })}
              />
            </Field>
            <Field label="Đến ngày" required>
              <TextInput
                type="date"
                required
                min={generateRange.from || undefined}
                value={generateRange.to}
                onChange={(e) => setGenerateRange({ ...generateRange, to: e.target.value })}
              />
            </Field>
          </Form>
        )}
        {modal === "copy" && (
          <Form
            id="schedule-copy"
            onSubmit={(e) => {
              e.preventDefault();
              if (selected) void copy(selected);
            }}
            className="space-y-4"
          >
            <p>
              {selected?.serviceName} · {selected?.roomName}
            </p>
            <Field
              label="Các ngày cần sao chép"
              required
              hint="Định dạng YYYY-MM-DD, cách nhau bằng dấu phẩy."
            >
              <TextArea
                required
                rows={4}
                placeholder="2026-10-10, 2026-10-12"
                value={copyDates}
                onChange={(e) => setCopyDates(e.target.value)}
              />
            </Field>
          </Form>
        )}
        {modal === "detail" && currentSlot && (
          <div className="at-catalog-details">
            <DetailList
              items={[
                { label: "Dịch vụ", value: currentSlot.serviceName },
                { label: "Phòng", value: currentSlot.roomName },
                { label: "Bắt đầu", value: formatDateTime(currentSlot.startsAt) },
                { label: "Kết thúc", value: formatDateTime(currentSlot.endsAt) },
                { label: "Trạng thái", value: statusLabel[currentSlot.status] },
              ]}
            />
            {currentSlot.note && (
              <section className="at-catalog-detail-section">
                <h3>Ghi chú</h3>
                <div className="at-catalog-description">{currentSlot.note}</div>
              </section>
            )}
            {currentSlot.rejectionReason && (
              <Notice tone="warning">Lý do từ chối: {currentSlot.rejectionReason}</Notice>
            )}
            {admin && currentSlot.status === "CLOSE_REQUESTED" && (
              <section className="at-catalog-detail-section">
                <h3>Lịch hẹn bị ảnh hưởng</h3>
                <QueryState
                  loading={affected.isLoading}
                  error={affected.error}
                  retry={() => void affected.refetch()}
                />
                {affected.data?.length
                  ? affected.data.map((a) => (
                      <p className="text-sm py-2" key={a.id}>
                        {a.code} · {a.patientName}
                      </p>
                    ))
                  : !affected.isLoading &&
                    !affected.error && (
                      <p className="text-sm text-muted">Không có bệnh nhân đã đặt.</p>
                    )}
              </section>
            )}
            {(doctor ||
              (admin && ["SUBMITTED", "CLOSE_REQUESTED"].includes(currentSlot.status))) && (
              <div className="flex justify-end">
                <RowMenu label="Thao tác lịch đang xem">{slotActions(currentSlot)}</RowMenu>
              </div>
            )}
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        key={confirmation?.title ?? "none"}
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title ?? "Xác nhận"}
        description={confirmation?.description ?? ""}
        actionLabel={confirmation?.label ?? "Xác nhận"}
        danger={confirmation?.danger}
        reason={confirmation?.reason}
        onConfirm={(reason) => confirmation?.run(reason) ?? Promise.resolve()}
      />
    </>
  );
}
