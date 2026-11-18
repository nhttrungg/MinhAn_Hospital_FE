"use client";
import { CalendarDays, Check, Clock, MapPin, Stethoscope, UserRound } from "lucide-react";
import { QrButton, DocumentButton } from "@/components/workflow-tools";
import type { Appointment } from "@/lib/types";
import { appointmentLabels } from "@/lib/outpatient";
import { formatVnd, formatDateTime } from "@/lib/format";
import { Button, Card, StatusBadge, ButtonLink } from "@/components/ui/primitives";
import {
  bringList,
  changePolicy,
  formatLongDate,
  formatTime,
  formatWeekday,
  relativeDay,
} from "./portal-format";
import { DoctorPortrait } from "./doctor-portrait";

type Handlers = {
  appointment: Appointment;
  doctorPhotoUrl?: string | null;
  onDetails: () => void;
  onCancel: () => void;
};

export function isEditable(a: Appointment) {
  return ["CONFIRMED", "NEEDS_RESCHEDULE"].includes(a.status);
}

export function AppointmentActions({ appointment: a, onDetails, onCancel }: Handlers) {
  return (
    <div className="at-appointment-actions">
      <Button variant="ghost" onClick={onDetails}>
        Chi tiết
      </Button>
      {["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(a.status) && (
        <QrButton kind="APPOINTMENT" sourceId={a.id} label="QR lần khám" />
      )}
      {["CHECKED_IN", "COMPLETED"].includes(a.status) && (
        <DocumentButton type="EXAMINATION_TICKET" sourceId={a.id} label="Phiếu khám" />
      )}
      {isEditable(a) && (
        <>
          <ButtonLink
            variant="ghost"
            href={`/booking?reschedule=${a.id}&doctorId=${a.slot.doctorId}&patientId=${a.patientId}`}
          >
            Đổi lịch
          </ButtonLink>
          <Button variant="danger" onClick={onCancel}>
            Hủy lịch
          </Button>
        </>
      )}
    </div>
  );
}

export function AppointmentCard({ appointment: a, doctorPhotoUrl, onDetails, onCancel }: Handlers) {
  const day = new Date(a.slot.startsAt).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
  });
  const month = new Date(a.slot.startsAt).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "2-digit",
    year: "numeric",
  });
  const upcoming = ["CONFIRMED", "NEEDS_RESCHEDULE"].includes(a.status);
  const relative = upcoming ? relativeDay(a.slot.startsAt) : "";
  return (
    <Card className="at-appointment-card">
      <div className="at-appointment-date">
        <small>{formatWeekday(a.slot.startsAt)}</small>
        <strong>{day}</strong>
        <span>{month}</span>
      </div>
      <div className="at-appointment-info">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <DoctorPortrait
              name={a.slot.doctorName}
              photoUrl={doctorPhotoUrl}
              className="at-slot-portrait"
              sizes="48px"
            />
            <div>
              <h2>{a.slot.doctorName}</h2>
              <p>
                <Stethoscope size={15} />
                {a.slot.serviceName}
              </p>
            </div>
          </div>
          <div className="at-appointment-badges">
            {relative && relative !== "Đã qua" && (
              <span className="at-appointment-relative">{relative}</span>
            )}
            <StatusBadge status={a.status}>{appointmentLabels[a.status]}</StatusBadge>
          </div>
        </div>
        <p>
          <UserRound size={15} aria-hidden />
          Người khám: {a.patientName}
        </p>
        <p>
          <CalendarDays size={15} />
          {formatDateTime(a.slot.startsAt)}
          <span className="at-appointment-divider">·</span>
          <MapPin size={15} />
          {a.slot.roomName}
        </p>
        <div className="at-appointment-bottom">
          <small>
            {a.code} · Phí khám {formatVnd(a.bookedPrice)}
            {a.queueNumber ? ` · Số chờ ${a.queueNumber}` : ""}
          </small>
          <AppointmentActions appointment={a} onDetails={onDetails} onCancel={onCancel} />
        </div>
      </div>
    </Card>
  );
}

/** "Next appointment" hero shown at the top of the patient dashboard. */
export function AppointmentHero({ appointment: a, doctorPhotoUrl, onDetails, onCancel }: Handlers) {
  return (
    <section className="at-card at-portal-hero" aria-labelledby="at-next-appointment">
      <div className="at-portal-hero-main">
        <p className="at-eyebrow">Lịch khám tiếp theo</p>
        <div className="flex items-center gap-3 mt-2 mb-3">
          <DoctorPortrait
            name={a.slot.doctorName}
            photoUrl={doctorPhotoUrl}
            className="at-slot-portrait"
            sizes="48px"
          />
          <div>
            <h2 id="at-next-appointment" className="!m-0">
              {a.slot.doctorName}
            </h2>
            <p className="at-portal-hero-service !m-0">
              <Stethoscope size={16} aria-hidden />
              {a.slot.serviceName}
            </p>
          </div>
        </div>
        <div className="at-portal-hero-when">
          <span className="at-portal-hero-time">
            <Clock size={20} aria-hidden />
            {formatTime(a.slot.startsAt)}
          </span>
          <span>{formatLongDate(a.slot.startsAt)}</span>
          <span className="at-appointment-relative">{relativeDay(a.slot.startsAt)}</span>
        </div>
        <p className="at-portal-hero-place">
          <MapPin size={16} aria-hidden />
          {a.slot.roomName}
          <span aria-hidden>·</span>
          <span>Mã {a.code}</span>
          {a.queueNumber ? (
            <>
              <span aria-hidden>·</span>
              <span>Số chờ {a.queueNumber}</span>
            </>
          ) : null}
        </p>
        <StatusBadge status={a.status}>{appointmentLabels[a.status]}</StatusBadge>
      </div>
      <div className="at-portal-hero-prepare">
        <h3>Chuẩn bị trước khi đến</h3>
        <ul>
          {bringList.slice(0, 4).map((item) => (
            <li key={item}>
              <Check size={15} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="at-portal-hero-actions">
        <AppointmentActions appointment={a} onDetails={onDetails} onCancel={onCancel} />
        {isEditable(a) && <p>{changePolicy}</p>}
      </div>
    </section>
  );
}
