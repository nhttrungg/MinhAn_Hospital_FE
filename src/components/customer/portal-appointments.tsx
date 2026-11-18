"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryString } from "@/lib/api";
import type { Appointment, PageResult } from "@/lib/types";
import { formatDateTime, formatVnd } from "@/lib/format";
import { appointmentLabels, vietnamDate } from "@/lib/outpatient";
import {
  Field,
  Pager,
  SelectInput,
  TextInput,
  StatusBadge,
  ButtonLink,
} from "@/components/ui/primitives";
import { PageHeader, FilterBar, DetailList, EmptyState } from "@/components/ui/data-display";
import { ConfirmDialog, Drawer, Tabs } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { QueryState, useUser } from "@/components/workspace-ui";
import { useDirectory } from "@/lib/public-clinic";
import { AppointmentCard, AppointmentHero } from "./portal-appointment-card";
import { FamilyPatientFilter } from "./family-patient-filter";
export function PortalAppointments() {
  const cache = useQueryClient();
  const toast = useToast();
  const [group, setGroup] = useState("upcoming");
  const me = useUser();
  const { doctors } = useDirectory();
  const doctorPhotos = new Map((doctors.data ?? []).map((d) => [d.id, d.photoUrl]));
  const [filters, setFilters] = useState({ from: vietnamDate(), to: vietnamDate(90), status: "" });
  const [page, setPage] = useState(0);
  const [patientId, setPatientId] = useState(0);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const query = useQuery({
    queryKey: ["appointments", me.data?.id, filters, patientId, page],
    enabled: me.data?.userType === "PATIENT",
    queryFn: ({ signal }) =>
      api<PageResult<Appointment>>(
        `/api/v1/appointments/search${queryString({ ...filters, patientId: patientId || null, page, size: 20 })}`,
        { signal },
      ),
  });
  const nextAppointment =
    group === "upcoming" && page === 0 && !filters.status
      ? query.data?.content.find((a) =>
          ["CONFIRMED", "CHECKED_IN", "NEEDS_RESCHEDULE"].includes(a.status),
        )
      : undefined;
  function changeGroup(value: string) {
    setGroup(value);
    setPage(0);
    setFilters({
      from: value === "history" ? vietnamDate(-365) : vietnamDate(),
      to: value === "history" ? vietnamDate() : vietnamDate(90),
      status: value === "needs" ? "NEEDS_RESCHEDULE" : "",
    });
  }
  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Tài khoản của tôi"
        title="Lịch hẹn của tôi"
        description="Theo dõi buổi khám, thay đổi lịch và chuẩn bị trước khi đến Minh An."
        actions={
          <ButtonLink variant="primary" href="/booking">
            Đặt lịch khám
          </ButtonLink>
        }
      />
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/portal/family" variant="ghost">
          Hồ sơ người thân
        </ButtonLink>
        <ButtonLink href="/portal/waitlist" variant="ghost">
          Danh sách chờ giờ khám
        </ButtonLink>
      </div>
      {nextAppointment && (
        <AppointmentHero
          appointment={nextAppointment}
          doctorPhotoUrl={doctorPhotos.get(nextAppointment.slot.doctorId)}
          onDetails={() => setSelected(nextAppointment)}
          onCancel={() => setCancel(nextAppointment)}
        />
      )}
      <Tabs
        value={group}
        onChange={changeGroup}
        label="Nhóm lịch hẹn"
        items={[
          { value: "upcoming", label: "Lịch sắp tới" },
          { value: "needs", label: "Cần đổi lịch" },
          { value: "history", label: "Lịch sử" },
        ]}
      >
        <FilterBar
          onClear={() => {
            changeGroup(group);
            setPatientId(0);
          }}
        >
          <FamilyPatientFilter
            value={patientId}
            onChange={(id) => {
              setPatientId(id);
              setPage(0);
              setSelected(null);
            }}
          />
          <Field label="Từ ngày">
            <TextInput
              type="date"
              value={filters.from}
              onChange={(e) => {
                setFilters({ ...filters, from: e.target.value });
                setPage(0);
              }}
            />
          </Field>
          <Field label="Đến ngày">
            <TextInput
              type="date"
              value={filters.to}
              onChange={(e) => {
                setFilters({ ...filters, to: e.target.value });
                setPage(0);
              }}
            />
          </Field>
          <Field label="Trạng thái">
            <SelectInput
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {Object.entries(appointmentLabels).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </FilterBar>
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {query.isSuccess && !query.data.content.length && (
          <EmptyState
            title={group === "needs" ? "Bạn không có lịch cần đổi" : "Chưa có lịch khám phù hợp"}
            description="Bạn có thể chọn bác sĩ và đặt giờ khám thuận tiện, hoặc thay đổi bộ lọc để xem lịch trước đây."
            action={
              <ButtonLink variant="primary" href="/booking">
                Tìm lịch khám
              </ButtonLink>
            }
          />
        )}
        <div className="space-y-4">
          {query.data?.content.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              doctorPhotoUrl={doctorPhotos.get(a.slot.doctorId)}
              onDetails={() => setSelected(a)}
              onCancel={() => setCancel(a)}
            />
          ))}
        </div>
        {query.data && query.data.content.length > 0 && (
          <Pager
            page={page}
            totalPages={query.data.totalPages}
            totalElements={query.data.totalElements}
            onPage={setPage}
          />
        )}
      </Tabs>
      <Drawer
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
        title="Chi tiết lịch hẹn"
        description={selected?.code}
      >
        {selected && (
          <div className="space-y-5">
            <StatusBadge status={selected.status}>{appointmentLabels[selected.status]}</StatusBadge>
            <DetailList
              items={[
                { label: "Người khám", value: selected.patientName },
                { label: "Bác sĩ", value: selected.slot.doctorName },
                { label: "Dịch vụ", value: selected.slot.serviceName },
                { label: "Thời gian", value: formatDateTime(selected.slot.startsAt) },
                { label: "Phòng", value: selected.slot.roomName },
                { label: "Phí khám", value: formatVnd(selected.bookedPrice) },
                { label: "Lý do khám", value: selected.symptoms || "Chưa cung cấp" },
                { label: "Số chờ", value: selected.queueNumber ?? "Chưa tiếp nhận" },
              ]}
            />
            <p className="text-sm text-muted">
              Khi đến cơ sở, cung cấp mã lịch hẹn để được tiếp nhận.
            </p>
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        key={cancel?.id ?? 0}
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
        title="Hủy lịch khám?"
        description="Giờ khám này sẽ được mở lại cho người khác. Bạn có thể đặt lịch khác sau khi hủy."
        reason
        danger
        actionLabel="Hủy lịch khám"
        onConfirm={async (reason) => {
          if (!cancel) return;
          await api(`/api/v1/appointments/${cancel.id}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason }),
          });
          await cache.invalidateQueries({ queryKey: ["appointments"] });
          toast("Đã hủy lịch khám.");
        }}
      >
        {cancel && (
          <DetailList
            items={[
              { label: "Mã lịch", value: cancel.code },
              { label: "Bác sĩ", value: cancel.slot.doctorName },
              { label: "Thời gian", value: formatDateTime(cancel.slot.startsAt) },
            ]}
          />
        )}
      </ConfirmDialog>
    </main>
  );
}
