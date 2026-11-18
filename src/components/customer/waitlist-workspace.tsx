"use client";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Form,
  Notice,
  SelectInput,
  StatusBadge,
  TextInput,
} from "@/components/ui/primitives";
import { DetailList, PageHeader } from "@/components/ui/data-display";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { QueryState, useUser } from "@/components/workspace-ui";
import { useFamilyPatients } from "@/hooks/use-family-patients";
import { api, queryString } from "@/lib/api";
import type { WaitlistEntry, WaitlistInput } from "@/lib/engagement-types";
import { vietnamDate } from "@/lib/outpatient";
import { useDirectory } from "@/lib/public-clinic";
import { FamilyPatientFilter } from "./family-patient-filter";
import { shiftDay } from "./portal-format";

export type WaitlistDefaults = Partial<WaitlistInput>;
const labels: Record<string, string> = {
  ACTIVE: "Đang chờ",
  NOTIFIED: "Đã thông báo",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết thời gian chờ",
  BOOKED: "Đã đặt lịch",
};
const cancellable = new Set(["ACTIVE", "NOTIFIED"]);

export function WaitlistForm({ defaults = {} }: { defaults?: WaitlistDefaults }) {
  const cache = useQueryClient();
  const { self, family, enabled } = useFamilyPatients();
  const { doctors, specialties } = useDirectory();
  const [form, setForm] = useState({
    patientId: defaults.patientId || 0,
    doctorId: defaults.doctorId || 0,
    serviceId: defaults.serviceId || 0,
    specialtyId: defaults.specialtyId || 0,
    dateFrom: defaults.dateFrom || vietnamDate(),
    dateTo: defaults.dateTo || defaults.dateFrom || vietnamDate(14),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const availableDoctors = (doctors.data ?? []).filter(
    (d) => !form.specialtyId || d.specialtyId === form.specialtyId,
  );
  const people = [...new Map(availableDoctors.map((d) => [d.id, d])).values()];
  const services = [
    ...new Map(
      availableDoctors
        .filter((d) => !form.doctorId || d.id === form.doctorId)
        .map((d) => [d.serviceId, d]),
    ).values(),
  ];
  const personValid =
    !form.patientId ||
    self.data?.id === form.patientId ||
    !!family.data?.some((p) => p.id === form.patientId && p.active);
  function update(next: Partial<typeof form>) {
    setForm((old) => ({ ...old, ...next }));
    setSaved(false);
    setError("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!personValid) {
      setError("Chọn hồ sơ của bạn hoặc người thân đang được quản lý.");
      return;
    }
    if (
      !form.dateFrom ||
      !form.dateTo ||
      form.dateFrom < vietnamDate() ||
      form.dateTo < form.dateFrom ||
      form.dateTo > shiftDay(form.dateFrom, 31)
    ) {
      setError(
        "Chọn khoảng ngày từ hôm nay, tối đa 32 ngày; ngày kết thúc không được trước ngày bắt đầu.",
      );
      return;
    }
    setBusy(true);
    try {
      await api("/api/v1/waitlist", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          patientId: form.patientId || null,
          doctorId: form.doctorId || null,
          serviceId: form.serviceId || null,
          specialtyId: form.specialtyId || null,
        }),
      });
      await cache.invalidateQueries({ queryKey: ["waitlist"] });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đăng ký được danh sách chờ.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4">
      <h2 className="at-section-title">Nhận thông báo khi có giờ khám</h2>
      <p className="text-sm text-muted">
        Chọn khoảng ngày thuận tiện. Khi có giờ phù hợp, bạn sẽ nhận thông báo để chủ động đặt lịch.
      </p>
      <QueryState
        loading={self.isLoading || family.isLoading || doctors.isLoading || specialties.isLoading}
        error={self.error || family.error || doctors.error || specialties.error}
        retry={() => {
          void self.refetch();
          void family.refetch();
          void doctors.refetch();
          void specialties.refetch();
        }}
      />
      <Form busy={busy} onSubmit={(e) => void save(e)} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {saved && (
          <Notice tone="success">
            Đã đăng ký chờ.{" "}
            <ButtonLink href="/portal/waitlist" variant="ghost">
              Xem danh sách chờ
            </ButtonLink>
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Người khám">
            <SelectInput
              value={form.patientId}
              onChange={(e) => update({ patientId: Number(e.target.value) })}
            >
              <option value={0}>{self.data?.fullName || "Tôi"} (Tôi)</option>
              {self.data && form.patientId === self.data.id && (
                <option value={self.data.id}>{self.data.fullName} (Tôi)</option>
              )}
              {family.data
                ?.filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} · {p.relationship}
                  </option>
                ))}
            </SelectInput>
          </Field>
          <Field label="Chuyên khoa">
            <SelectInput
              value={form.specialtyId}
              onChange={(e) =>
                update({ specialtyId: Number(e.target.value), doctorId: 0, serviceId: 0 })
              }
            >
              <option value={0}>Tất cả chuyên khoa</option>
              {specialties.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Bác sĩ">
            <SelectInput
              value={form.doctorId}
              onChange={(e) => update({ doctorId: Number(e.target.value), serviceId: 0 })}
            >
              <option value={0}>Bất kỳ bác sĩ phù hợp</option>
              {people.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Dịch vụ">
            <SelectInput
              value={form.serviceId}
              onChange={(e) => update({ serviceId: Number(e.target.value) })}
            >
              <option value={0}>Bất kỳ dịch vụ phù hợp</option>
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.serviceName}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Từ ngày" required>
            <TextInput
              required
              type="date"
              min={vietnamDate()}
              value={form.dateFrom}
              onChange={(e) => update({ dateFrom: e.target.value })}
            />
          </Field>
          <Field label="Đến ngày" required hint="Khoảng chờ tối đa 32 ngày.">
            <TextInput
              required
              type="date"
              min={form.dateFrom || vietnamDate()}
              max={shiftDay(form.dateFrom || vietnamDate(), 31)}
              value={form.dateTo}
              onChange={(e) => update({ dateTo: e.target.value })}
            />
          </Field>
        </div>
        <Button
          type="submit"
          busy={busy}
          disabled={
            saved ||
            !enabled ||
            !personValid ||
            !self.isSuccess ||
            !family.isSuccess ||
            !doctors.isSuccess ||
            !specialties.isSuccess
          }
        >
          Đăng ký chờ giờ khám
        </Button>
      </Form>
    </Card>
  );
}

export function WaitlistWorkspace({ defaults }: { defaults?: WaitlistDefaults }) {
  const me = useUser();
  const { enabled } = useFamilyPatients();
  const { doctors, specialties } = useDirectory();
  const cache = useQueryClient();
  const toast = useToast();
  const [patientId, setPatientId] = useState(0);
  const [remove, setRemove] = useState<WaitlistEntry | null>(null);
  const list = useQuery({
    queryKey: ["waitlist", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<WaitlistEntry[]>("/api/v1/waitlist/me", { signal }),
    enabled,
  });
  const rows = list.data?.filter((row) => !patientId || row.patientId === patientId) ?? [];
  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Chủ động đặt khám"
        title="Danh sách chờ giờ khám"
        description="Theo dõi yêu cầu và hủy chờ khi bạn không còn nhu cầu."
        actions={
          <ButtonLink href="/booking" variant="ghost">
            Xem lịch khám
          </ButtonLink>
        }
      />
      <WaitlistForm defaults={defaults} />
      <FamilyPatientFilter value={patientId} onChange={setPatientId} />
      <QueryState
        loading={list.isLoading}
        error={list.error}
        retry={() => void list.refetch()}
        empty={list.isSuccess && !rows.length}
        emptyTitle="Chưa có yêu cầu chờ phù hợp"
        emptyDescription="Đăng ký khoảng ngày mong muốn ở trên để nhận thông báo khi có giờ khám."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.id} className="space-y-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{row.patientName}</h2>
              <StatusBadge status={row.status}>{labels[row.status] ?? row.status}</StatusBadge>
            </div>
            <DetailList
              items={[
                {
                  label: "Khoảng ngày",
                  value: `${row.dateFrom.split("-").reverse().join("/")} – ${row.dateTo.split("-").reverse().join("/")}`,
                },
                {
                  label: "Bác sĩ",
                  value:
                    row.doctorName ||
                    doctors.data?.find((d) => d.id === row.doctorId)?.fullName ||
                    (row.doctorId ? `Bác sĩ #${row.doctorId}` : "Bất kỳ bác sĩ phù hợp"),
                },
                {
                  label: "Dịch vụ",
                  value:
                    row.serviceName ||
                    doctors.data?.find((d) => d.serviceId === row.serviceId)?.serviceName ||
                    (row.serviceId ? `Dịch vụ #${row.serviceId}` : "Bất kỳ dịch vụ phù hợp"),
                },
                {
                  label: "Chuyên khoa",
                  value:
                    row.specialtyName ||
                    specialties.data?.find((s) => s.id === row.specialtyId)?.name ||
                    (row.specialtyId ? `Chuyên khoa #${row.specialtyId}` : "Tất cả chuyên khoa"),
                },
              ]}
            />
            {cancellable.has(row.status) && (
              <div className="flex flex-wrap gap-2">
                <ButtonLink
                  href={`/booking${queryString({ doctorId: row.doctorId, serviceId: row.serviceId, specialtyId: row.specialtyId, patientId: row.patientId, date: row.dateFrom >= vietnamDate() ? row.dateFrom : vietnamDate() })}`}
                  variant="ghost"
                >
                  Xem lịch phù hợp
                </ButtonLink>
                <Button variant="danger" onClick={() => setRemove(row)}>
                  Hủy yêu cầu chờ
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        danger
        title="Hủy chờ giờ khám?"
        description={`Bạn sẽ ngừng nhận thông báo cho yêu cầu chờ của ${remove?.patientName ?? "người khám"}.`}
        actionLabel="Hủy yêu cầu chờ"
        onConfirm={async () => {
          if (!remove) return;
          await api(`/api/v1/waitlist/${remove.id}`, { method: "DELETE" });
          await cache.invalidateQueries({ queryKey: ["waitlist"] });
          toast("Đã hủy yêu cầu chờ.");
        }}
      />
    </main>
  );
}
