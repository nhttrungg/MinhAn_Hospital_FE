"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  MapPin,
  Printer,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  Button,
  Card,
  Field,
  TextArea,
  SearchInput,
  Notice,
  RadioCard,
  ButtonLink,
  StatusBadge,
} from "@/components/ui/primitives";
import { Combobox, DatePicker } from "@/components/ui/selection";
import { DetailList, EmptyState } from "@/components/ui/data-display";
import { useToast } from "@/components/ui/toast";
import { QueryState } from "@/components/workspace-ui";
import { formatDateTime, formatVnd } from "@/lib/format";
import { vietnamDate } from "@/lib/outpatient";
import type { Slot } from "@/lib/types";
import type { BookingState } from "@/hooks/use-booking";
import { WaitlistForm } from "./waitlist-workspace";
import { DoctorPortrait } from "./doctor-portrait";
import { queryString } from "@/lib/api";
import {
  bringList,
  changePolicy,
  downloadIcs,
  formatLongDate,
  formatTime,
  shiftDay,
} from "./portal-format";

export const BOOKING_STEPS = ["Nhu cầu khám", "Chọn lịch", "Thông tin khám", "Xác nhận"];

export function BookingStepper({ state: s }: { state: BookingState }) {
  return (
    <nav className="at-bk-stepper-wrap" aria-label="Tiến trình đặt khám">
      <p className="at-bk-progress" aria-live="polite">
        Bước {s.step}/{BOOKING_STEPS.length} · <strong>{BOOKING_STEPS[s.step - 1]}</strong>
      </p>
      <ol className="at-bk-stepper" aria-label="Các bước đặt khám">
        {BOOKING_STEPS.map((label, i) => {
          const n = i + 1;
          const done = s.step > n;
          const body = (
            <>
              <span className="at-bk-step-dot">{done ? <Check size={16} aria-hidden /> : n}</span>
              <strong>{label}</strong>
            </>
          );
          return (
            <li key={label} data-active={s.step === n} data-done={done}>
              {done ? (
                <Button
                  appearance="custom"
                  className="at-bk-step-link"
                  disabled={s.busy}
                  aria-label={`Quay lại bước ${n}: ${label}`}
                  onClick={() => s.setStep(n)}
                >
                  {body}
                </Button>
              ) : (
                <span
                  className="at-bk-step-static"
                  aria-current={s.step === n ? "step" : undefined}
                >
                  {body}
                </span>
              )}
              {n < BOOKING_STEPS.length && <ChevronRight size={16} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function NeedStep({ state: s }: { state: BookingState }) {
  const docs = [...new Map(s.doctors.data?.map((d) => [d.id, d])).values()];
  return (
    <Card className="space-y-5">
      <h2 className="at-section-title">Bạn muốn tìm lịch theo cách nào?</h2>
      <div className="at-choice-grid">
        <RadioCard
          icon={<Stethoscope />}
          description="Tìm bác sĩ phù hợp với nhu cầu khám."
          name="booking-mode"
          value="specialty"
          checked={s.mode === "specialty"}
          onChange={() => s.setMode("specialty")}
          label="Tìm theo chuyên khoa"
        />
        <RadioCard
          icon={<UserRound />}
          description="Chọn bác sĩ bạn muốn đặt lịch trực tiếp."
          name="booking-mode"
          value="doctor"
          checked={s.mode === "doctor"}
          onChange={() => s.setMode("doctor")}
          label="Tôi đã biết bác sĩ"
        />
      </div>
      <QueryState
        loading={s.specialties.isLoading || s.doctors.isLoading}
        error={s.specialties.error || s.doctors.error}
        retry={() => {
          void s.specialties.refetch();
          void s.doctors.refetch();
        }}
      />
      {s.mode === "specialty" && (
        <Field label="Chuyên khoa" hint="Không chọn chuyên khoa để xem lịch của tất cả bác sĩ.">
          <Combobox
            value={String(s.specialtyId || "")}
            onChange={(v) => {
              s.setSpecialtyId(Number(v));
              s.setDoctorId(0);
              s.setServiceId(0);
            }}
            placeholder="Chọn chuyên khoa cần khám"
            options={[
              { value: "0", label: "Tất cả chuyên khoa" },
              ...(s.specialties.data ?? []).map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />
        </Field>
      )}
      <Field
        label="Bác sĩ"
        hint={
          s.mode === "doctor" && !s.doctorId
            ? "Chọn một bác sĩ, hoặc để mặc định để xem tất cả bác sĩ phù hợp."
            : undefined
        }
      >
        <Combobox
          value={String(s.doctorId || "0")}
          onChange={(v) => {
            s.setDoctorId(Number(v));
            s.setServiceId(0);
          }}
          options={[
            { value: "0", label: "Xem tất cả bác sĩ phù hợp" },
            ...docs.map((d) => ({
              value: String(d.id),
              label: d.fullName,
              description: d.specialtyName,
            })),
          ]}
        />
      </Field>
      <div className="at-booking-actions at-bk-end">
        <Button onClick={() => s.setStep(2)}>
          Tiếp tục chọn lịch
          <ChevronRight size={16} />
        </Button>
      </div>
    </Card>
  );
}

function slotHour(slot: Slot): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(slot.startsAt)),
  );
}

function SlotCard({ slot, state: s }: { slot: Slot; state: BookingState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const past = new Date(slot.startsAt).getTime() <= now;
  const unavailable = !slot.available || past;
  const chosen = s.selected?.id === slot.id;
  const doc = s.doctors.data?.find((d) => d.id === slot.doctorId);
  return (
    <div className="at-card at-bk-slot-card" data-selected={chosen} data-unavailable={unavailable}>
      <div className="at-bk-slot-time">
        <Clock size={16} aria-hidden />
        <strong>{formatTime(slot.startsAt)}</strong>
        <span>– {formatTime(slot.endsAt)}</span>
        {chosen && <StatusBadge tone="info">Đang chọn</StatusBadge>}
        {unavailable && <StatusBadge tone="neutral">{past ? "Đã qua giờ" : "Đã kín"}</StatusBadge>}
      </div>
      <div className="flex items-center gap-3">
        <DoctorPortrait
          name={slot.doctorName}
          photoUrl={doc?.photoUrl}
          className="at-slot-portrait"
          sizes="48px"
        />
        <div>
          <h3 className="font-semibold text-sm">{slot.doctorName}</h3>
          <p className="text-xs text-muted mt-1">
            {slot.serviceName} · {slot.roomName}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <strong className="text-brand text-sm">{formatVnd(slot.price)}</strong>
        {unavailable ? (
          <Button variant="ghost" disabled>
            Không thể chọn
          </Button>
        ) : (
          <Button onClick={() => s.choose(slot)} variant={chosen ? "ghost" : "primary"}>
            {chosen ? "Tiếp tục với giờ này" : "Chọn giờ này"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function SlotStep({ state: s }: { state: BookingState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const services = [
    ...new Map(
      s.doctors.data
        ?.filter((d) => !s.doctorId || d.id === s.doctorId)
        .map((d) => [d.serviceId, d]),
    ).values(),
  ];
  const today = vietnamDate();
  const date = s.date || vietnamDate(1);
  const guest = !s.me.isLoading && !s.me.data;
  return (
    <div className="space-y-5">
      {s.rescheduleId > 0 && s.old.data && (
        <Notice tone="info">
          Bạn đang đổi lịch <strong>{s.old.data.code}</strong> (
          {formatDateTime(s.old.data.slot.startsAt)} · {s.old.data.slot.doctorName}). Lịch cũ được
          giữ cho đến khi bạn xác nhận lịch mới.
        </Notice>
      )}
      {guest && (
        <Notice tone="info">
          Bạn có thể xem giờ trống ngay. Khi chọn giờ khám, hệ thống sẽ yêu cầu đăng nhập và giữ
          nguyên lựa chọn của bạn.
        </Notice>
      )}
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày khám">
            <DatePicker value={s.date} onChange={s.setDate} min={today} label="Ngày khám" />
          </Field>
          <Field label="Dịch vụ khám">
            <Combobox
              value={String(s.serviceId || "0")}
              onChange={(v) => s.setServiceId(Number(v))}
              options={[
                { value: "0", label: "Tất cả dịch vụ" },
                ...services.map((d) => ({ value: String(d.serviceId), label: d.serviceName })),
              ]}
            />
          </Field>
        </div>
        <div className="at-bk-daynav">
          <Button
            variant="ghost"
            size="sm"
            disabled={date <= today}
            onClick={() => s.setDate(shiftDay(date, -1))}
          >
            <ChevronLeft size={15} aria-hidden />
            Ngày trước
          </Button>
          <span aria-live="polite">{formatLongDate(`${date}T00:00:00+07:00`)}</span>
          <Button variant="ghost" size="sm" onClick={() => s.setDate(shiftDay(date, 1))}>
            Ngày sau
            <ChevronRight size={15} aria-hidden />
          </Button>
        </div>
      </Card>
      <QueryState
        loading={s.slots.isLoading}
        error={s.slots.error}
        retry={() => void s.slots.refetch()}
      />
      {s.slots.isSuccess && s.slots.data.length > 0 && (
        <ul className="at-bk-legend" aria-label="Chú thích trạng thái giờ khám">
          <li data-state="free">Còn trống</li>
          <li data-state="chosen">Đang chọn</li>
          <li data-state="full">Đã kín / đã qua giờ</li>
        </ul>
      )}
      {[
        ["Sáng", 0, 12],
        ["Chiều", 12, 17],
        ["Tối", 17, 24],
      ].map(([name, from, to]) => {
        const rows =
          s.slots.data?.filter((slot) => {
            const hour = slotHour(slot);
            return hour >= Number(from) && hour < Number(to);
          }) ?? [];
        const open = rows.filter((slot) => slot.available).length;
        return (
          rows.length > 0 && (
            <section key={name}>
              <h2 className="at-section-title">
                Buổi {String(name).toLowerCase()}
                <small className="text-muted font-normal">{open} giờ trống</small>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} state={s} />
                ))}
              </div>
            </section>
          )
        );
      })}
      {s.slots.isSuccess && !s.slots.data.length && (
        <EmptyState
          title="Ngày này chưa có giờ phù hợp"
          description="Bạn có thể chọn ngày khác hoặc quay lại thay đổi bác sĩ."
          action={
            <div className="at-bk-empty-actions">
              <Button onClick={() => s.setDate(shiftDay(date, 1))}>Xem ngày hôm sau</Button>
              <Button variant="ghost" onClick={() => s.setStep(1)}>
                Đổi bác sĩ hoặc chuyên khoa
              </Button>
            </div>
          }
        />
      )}
      {s.slots.isSuccess &&
        !s.rescheduleId &&
        !s.slots.data.some((slot) => slot.available && new Date(slot.startsAt).getTime() > now) &&
        (s.me.data?.userType === "PATIENT" ? (
          <WaitlistForm
            key={`${date}-${s.doctorId}-${s.serviceId}-${s.specialtyId}-${s.patientId}`}
            defaults={{
              patientId: s.patientId || null,
              doctorId: s.doctorId || null,
              serviceId: s.serviceId || null,
              specialtyId: s.specialtyId || null,
              dateFrom: date,
              dateTo: shiftDay(date, 7),
            }}
          />
        ) : guest ? (
          <Card className="space-y-3">
            <h2 className="at-section-title">Chờ giờ khám phù hợp</h2>
            <p className="text-sm text-muted">Đăng nhập để nhận thông báo khi có giờ khám trống.</p>
            <ButtonLink
              href={`/login?next=${encodeURIComponent(`/portal/waitlist${queryString({ doctorId: s.doctorId || null, serviceId: s.serviceId || null, specialtyId: s.specialtyId || null, date })}`)}`}
            >
              Đăng nhập để đăng ký chờ
            </ButtonLink>
          </Card>
        ) : null)}
      <Button variant="ghost" onClick={() => s.setStep(1)}>
        ← Đổi nhu cầu khám
      </Button>
    </div>
  );
}

function BringList() {
  return (
    <div className="at-bk-bring">
      <h3>Nên mang theo khi đến khám</h3>
      <ul>
        {bringList.map((item) => (
          <li key={item}>
            <Check size={15} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PatientStep({ state: s }: { state: BookingState }) {
  const needsPatient = s.reception && !s.patientId;
  const phone = s.person?.phone;
  return (
    <Card className="space-y-5">
      <h2 className="at-section-title">Thông tin người khám</h2>
      {s.followUp && (
        <Notice>
          Đặt lịch tái khám theo hẹn. Bạn có thể chọn ngày khác nếu ngày được đề nghị đã kín.
        </Notice>
      )}
      {s.reception ? (
        <>
          <Field label="Tìm hồ sơ bệnh nhân">
            <SearchInput
              value={s.patientSearch}
              onChange={(e) => {
                s.setPatientSearch(e.target.value);
                s.setPatientId(0);
              }}
              placeholder="Tên, mã hoặc số điện thoại"
            />
          </Field>
          <Field
            label="Bệnh nhân"
            required
            hint={needsPatient ? "Chọn hồ sơ bệnh nhân để tiếp tục." : undefined}
          >
            <Combobox
              value={String(s.patientId || "")}
              onChange={(v) => s.setPatientId(Number(v))}
              options={(s.patients.data ?? []).map((p) => ({
                value: String(p.id),
                label: p.fullName,
                description: `${p.code} · ${p.phone ?? "Chưa có số điện thoại"}`,
              }))}
            />
          </Field>
          <ButtonLink variant="ghost" href="/staff/patients">
            Tạo hồ sơ cho khách mới →
          </ButtonLink>
        </>
      ) : (
        <>
          <QueryState
            loading={s.patient.isLoading || s.family.isLoading}
            error={s.patient.error || s.family.error}
            retry={() => {
              void s.patient.refetch();
              void s.family.refetch();
            }}
          />
          {!s.rescheduleId && (
            <>
              <Field label="Đặt khám cho" required>
                <Combobox
                  value={String(s.patientId)}
                  onChange={(value) => s.setPatientId(Number(value))}
                  options={[
                    { value: "0", label: `${s.patient.data?.fullName || "Tôi"} (Tôi)` },
                    ...(s.patientId === s.patient.data?.id
                      ? [{ value: String(s.patientId), label: `${s.patient.data.fullName} (Tôi)` }]
                      : []),
                    ...(s.family.data ?? [])
                      .filter((p) => p.active)
                      .map((p) => ({
                        value: String(p.id),
                        label: p.fullName,
                        description: p.relationship,
                      })),
                  ]}
                />
              </Field>
              <ButtonLink href="/portal/family" variant="ghost">
                Quản lý hồ sơ người thân
              </ButtonLink>
              {!!s.patientId && s.patient.isSuccess && s.family.isSuccess && !s.person && (
                <Notice tone="error">
                  Hồ sơ được chọn không còn trong danh sách người thân. Vui lòng chọn lại người
                  khám.
                </Notice>
              )}
            </>
          )}
          <DetailList
            items={[
              {
                label: "Họ tên",
                value: s.rescheduleId ? s.old.data?.patientName : s.person?.fullName,
              },
              { label: "Điện thoại", value: phone || "Chưa khai báo" },
              { label: "Email", value: s.person?.email || s.me.data?.email || "Chưa khai báo" },
            ]}
          />
          {s.person && !phone && (
            <Notice tone="warning">
              Hồ sơ chưa có số điện thoại. Bạn nên bổ sung trong mục Hồ sơ cá nhân để phòng khám có
              thể liên hệ khi cần thay đổi lịch.
            </Notice>
          )}
        </>
      )}
      {s.rescheduleId ? (
        <Notice>
          Đổi lịch chỉ thay đổi giờ khám; lý do khám của lịch hẹn hiện tại được giữ nguyên.
        </Notice>
      ) : (
        <Field
          label="Lý do khám (không bắt buộc)"
          hint={`Mô tả ngắn để bác sĩ chuẩn bị cho buổi khám. ${s.symptoms.length}/1000 ký tự.`}
        >
          <TextArea
            value={s.symptoms}
            onChange={(e) => s.setSymptoms(e.target.value)}
            maxLength={1000}
          />
        </Field>
      )}
      <BringList />
      {!s.selected && (
        <Notice tone="warning">Giờ khám đã thay đổi. Hãy quay lại chọn giờ còn trống.</Notice>
      )}
      <div className="at-booking-actions">
        <Button variant="ghost" onClick={() => s.setStep(2)}>
          ← Chọn lại lịch
        </Button>
        <Button
          disabled={
            !s.selected ||
            (!s.rescheduleId && !s.person) ||
            (s.rescheduleId > 0 && !s.old.isSuccess)
          }
          onClick={() => s.setStep(4)}
        >
          Kiểm tra lịch khám
          <ChevronRight size={16} />
        </Button>
      </div>
    </Card>
  );
}

function pending(text: string): ReactNode {
  return <span className="at-bk-pending">{text}</span>;
}

export function BookingSummary({ state: s }: { state: BookingState }) {
  const specialty = s.specialties.data?.find((x) => x.id === s.specialtyId)?.name;
  const doctor = s.doctors.data?.find((d) => d.id === (s.selected?.doctorId || s.doctorId));
  const date = s.date || vietnamDate(1);
  const brief = s.selected
    ? `${s.selected.doctorName} · ${formatDateTime(s.selected.startsAt)} · ${formatVnd(s.selected.price)}`
    : "Chọn bác sĩ và giờ khám để xem thông tin xác nhận.";
  return (
    <Card className="at-booking-summary">
      <h2 className="at-section-title">
        <span className="at-bk-summary-title">
          <CalendarCheck size={19} />
          Lịch khám của bạn
        </span>
        <small className="at-bk-summary-step">
          {s.step}/{BOOKING_STEPS.length}
        </small>
      </h2>
      <p className="at-bk-summary-line">{brief}</p>
      {doctor && (
        <div className="at-bk-summary-doctor">
          <DoctorPortrait
            name={doctor.fullName}
            photoUrl={doctor.photoUrl}
            className="at-slot-portrait"
            sizes="48px"
          />
          <div>
            <strong className="text-sm block">{doctor.fullName}</strong>
            <span className="text-xs text-muted">{doctor.specialtyName}</span>
          </div>
        </div>
      )}
      <div className="at-bk-summary-full">
        {s.selected ? (
          <DetailList
            items={[
              { label: "Bác sĩ", value: s.selected.doctorName },
              { label: "Dịch vụ", value: s.selected.serviceName },
              { label: "Thời gian", value: formatDateTime(s.selected.startsAt) },
              { label: "Phòng", value: s.selected.roomName },
              { label: "Phí khám", value: formatVnd(s.selected.price) },
            ]}
          />
        ) : (
          <DetailList
            items={[
              ...(s.mode === "specialty"
                ? [{ label: "Chuyên khoa", value: specialty ?? "Tất cả chuyên khoa" }]
                : []),
              {
                label: "Bác sĩ",
                value:
                  doctor?.fullName ??
                  (s.mode === "doctor" ? pending("Chưa chọn") : "Tất cả bác sĩ phù hợp"),
              },
              { label: "Ngày khám", value: formatLongDate(`${date}T00:00:00+07:00`) },
              { label: "Giờ khám", value: pending("Chưa chọn") },
            ]}
          />
        )}
        {s.selected && s.step >= 3 && (
          <div className="at-bk-summary-edit">
            <Button variant="ghost" size="sm" disabled={s.busy} onClick={() => s.setStep(2)}>
              Đổi giờ khám
            </Button>
          </div>
        )}
      </div>
      <p className="at-booking-note">
        Lịch được xác nhận ngay khi đặt thành công. Vui lòng đến đúng giờ để làm thủ tục tiếp nhận.
      </p>
    </Card>
  );
}

export function ReviewStep({ state: s }: { state: BookingState }) {
  const symptoms = s.rescheduleId ? s.old.data?.symptoms : s.symptoms;
  return (
    <Card className="space-y-5">
      <h2 className="at-section-title">Kiểm tra trước khi xác nhận</h2>
      <DetailList
        items={[
          {
            label: "Người khám",
            value: s.rescheduleId ? s.old.data?.patientName : s.person?.fullName,
          },
          { label: "Lý do khám", value: symptoms || "Chưa cung cấp" },
          { label: "Bác sĩ", value: s.selected?.doctorName },
          { label: "Dịch vụ", value: s.selected?.serviceName },
          { label: "Lịch mới", value: s.selected && formatDateTime(s.selected.startsAt) },
          { label: "Phòng", value: s.selected?.roomName },
          { label: "Phí khám", value: formatVnd(s.selected?.price ?? null) },
        ]}
      />
      {s.rescheduleId > 0 && s.old.data && (
        <Notice>
          <strong>Lịch hiện tại:</strong> {formatDateTime(s.old.data.slot.startsAt)} ·{" "}
          {s.old.data.slot.doctorName}. Lịch cũ được giữ nếu đổi không thành công.
        </Notice>
      )}
      <p className="at-bk-policy">{changePolicy}</p>
      {!s.selected && (
        <Notice tone="warning">Giờ khám đã thay đổi. Hãy quay lại chọn giờ còn trống.</Notice>
      )}
      <div className="at-booking-actions">
        <Button variant="ghost" disabled={s.busy} onClick={() => s.setStep(3)}>
          ← Sửa thông tin
        </Button>
        <Button
          busy={s.busy}
          disabled={
            !s.selected ||
            (!s.rescheduleId && !s.person) ||
            (s.rescheduleId > 0 && !s.old.isSuccess)
          }
          onClick={() => void s.confirm()}
        >
          {s.rescheduleId ? "Xác nhận đổi lịch" : "Xác nhận đặt lịch"}
        </Button>
      </div>
    </Card>
  );
}

export function BookingSuccess({ state: s }: { state: BookingState }) {
  const toast = useToast();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "center" });
  }, []);
  const result = s.result;
  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      toast("Đã sao chép mã lịch khám.");
    } catch {
      toast("Không sao chép được. Hãy chọn và sao chép mã thủ công.", "error");
    }
  }
  return (
    <Card className="at-booking-success at-bk-success">
      <p className="at-bk-print-brand">Minh An Clinic · Phiếu hẹn khám</p>
      <CheckCircle2 size={48} aria-hidden />
      <h2 ref={heading} tabIndex={-1}>
        {s.rescheduleId ? "Đã đổi lịch thành công" : "Đặt lịch thành công"}
      </h2>
      <p>Mã lịch khám của bạn</p>
      <div className="at-bk-code">
        <span>{result?.code}</span>
        <Button
          variant="ghost"
          size="sm"
          className="no-print"
          aria-label="Sao chép mã lịch khám"
          onClick={() => void copy()}
        >
          <Copy size={15} aria-hidden />
          Sao chép
        </Button>
      </div>
      <p>
        {result?.slot.doctorName} · {result && formatDateTime(result.slot.startsAt)}
      </p>
      {result && (
        <div className="at-bk-success-details">
          <DetailList
            items={[
              { label: "Người khám", value: result.patientName },
              { label: "Dịch vụ", value: result.slot.serviceName },
              {
                label: "Địa điểm",
                value: (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} aria-hidden />
                    {result.slot.roomName}
                  </span>
                ),
              },
              { label: "Phí khám", value: formatVnd(result.bookedPrice) },
            ]}
          />
          <BringList />
          <p className="at-bk-policy">{changePolicy}</p>
        </div>
      )}
      <div className="at-bk-success-actions no-print">
        <ButtonLink variant="primary" href={s.reception ? "/staff/appointments" : "/portal"}>
          Xem lịch hẹn
        </ButtonLink>
        {result && (
          <Button variant="ghost" onClick={() => downloadIcs(result)}>
            <CalendarPlus size={16} aria-hidden />
            Thêm vào lịch
          </Button>
        )}
        <Button variant="ghost" onClick={() => window.print()}>
          <Printer size={16} aria-hidden />
          In phiếu hẹn
        </Button>
      </div>
    </Card>
  );
}
