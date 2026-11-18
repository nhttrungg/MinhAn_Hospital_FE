"use client";
import { InlineStatus } from "@/components/ui/data-display";
import { EmptySearchIllustration, SpecialtyIcon } from "@/components/ui/medical-illustrations";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatVnd } from "@/lib/format";
import type { Doctor, Specialty } from "@/lib/types";
import { DoctorPortrait } from "./doctor-portrait";
import { descriptionPreview } from "./description-content";
import { RatingSummary } from "./doctor-reviews";
import type { RatedDoctor } from "@/lib/engagement-types";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="public-breadcrumb" aria-label="Đường dẫn trang">
      <ol>
        <li>
          <Link href="/">Trang chủ</Link>
        </li>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              <ChevronRight size={13} aria-hidden="true" />
              {crumb.href && !last ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
  crumbs,
  actions,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="public-page-heading">
      <div className="public-container">
        <Breadcrumbs trail={crumbs ?? [{ label: eyebrow }]} />
        <div className="public-page-heading-row">
          <div>
            <p className="public-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {children && <p className="public-intro">{children}</p>}
          </div>
          {actions && <div className="public-page-actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

function SkeletonCards({ count, variant }: { count: number; variant: "doctor" | "specialty" }) {
  return (
    <div
      className={variant === "doctor" ? "public-doctor-grid" : "public-specialty-grid"}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className={`public-skeleton-card public-skeleton-${variant}`} key={index}>
          <span className="public-skeleton-block" />
          <div>
            <span className="public-skeleton-line wide" />
            <span className="public-skeleton-line" />
            <span className="public-skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Error with retry, or a skeleton placeholder while the directory is loading. */
export function LoadingState({
  error,
  loading,
  retry,
  skeleton,
  count = 3,
}: {
  error: boolean;
  loading: boolean;
  retry: () => void;
  skeleton?: "doctor" | "specialty" | "text";
  count?: number;
}) {
  if (error)
    return (
      <InlineStatus className="public-notice public-notice-error" as="div" tone="error">
        <span>Chưa tải được thông tin. Vui lòng thử lại.</span>{" "}
        <Button appearance="custom" className="public-notice-action" type="button" onClick={retry}>
          Tải lại
        </Button>
      </InlineStatus>
    );
  if (loading)
    return (
      <>
        <InlineStatus className="sr-only" as="p" tone="info">
          Đang tải thông tin…
        </InlineStatus>
        {skeleton === "doctor" || skeleton === "specialty" ? (
          <SkeletonCards count={count} variant={skeleton} />
        ) : (
          <div className="public-skeleton-text" aria-hidden="true">
            <span className="public-skeleton-line wide" />
            <span className="public-skeleton-line" />
            <span className="public-skeleton-line short" />
          </div>
        )}
      </>
    );
  return null;
}

export function PublicEmpty({
  title,
  children,
  action,
  heading = "h2",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  heading?: "h1" | "h2";
}) {
  const Heading = heading;
  return (
    <div className="public-empty">
      <span className="public-empty-icon" aria-hidden="true">
        <EmptySearchIllustration />
      </span>
      <Heading>{title}</Heading>
      {children && <p>{children}</p>}
      {action && <div className="public-empty-actions">{action}</div>}
    </div>
  );
}

export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button
      appearance="custom"
      className="public-chip"
      type="button"
      aria-label={`Bỏ lọc ${label}`}
      onClick={onRemove}
    >
      {label}
      <span aria-hidden="true">✕</span>
    </Button>
  );
}

export function DoctorCard({ doctor, services }: { doctor: RatedDoctor; services: Doctor[] }) {
  const prices = services
    .filter((item) => item.id === doctor.id && item.price !== null)
    .map((item) => Number(item.price));
  return (
    <article className="public-doctor-card">
      <div className="doctor-card-visual">
        <DoctorPortrait name={doctor.fullName} photoUrl={doctor.photoUrl} />
        <span className="doctor-specialty">{doctor.specialtyName}</span>
      </div>
      <div className="doctor-card-body">
        <p className="public-eyebrow">{doctor.title || "Bác sĩ"}</p>
        <h3>
          <Link href={`/doctors/${doctor.id}`}>{doctor.fullName}</Link>
        </h3>
        <RatingSummary ratingAverage={doctor.ratingAverage} ratingCount={doctor.ratingCount} />
        <p className="doctor-card-bio">
          {descriptionPreview(
            doctor.bio,
            `Khám và tư vấn chuyên khoa ${doctor.specialtyName.toLowerCase()}.`,
          )}
        </p>
        <div className="doctor-card-bottom">
          <span>
            <small>Giá khám từ</small>
            <strong>
              {prices.length ? formatVnd(String(Math.min(...prices))) : "Liên hệ cơ sở"}
            </strong>
          </span>
          <ButtonLink
            appearance="public"
            variant="ghost"
            className="small"
            href={`/booking?doctorId=${doctor.id}`}
          >
            Xem lịch <span aria-hidden="true">↗</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

export function SpecialtyCard({ specialty, count }: { specialty: Specialty; count: number }) {
  return (
    <Link className="public-specialty-card" href={`/specialties/${specialty.id}`}>
      <span className="specialty-icon" aria-hidden="true">
        <SpecialtyIcon name={specialty.name} size={26} />
      </span>
      <div>
        <h3>{specialty.name}</h3>
        <p>
          {descriptionPreview(specialty.description, "Tìm hiểu dịch vụ khám và đội ngũ bác sĩ.")}
        </p>
        <span className="specialty-count">{count} bác sĩ</span>
      </div>
      <span className="specialty-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}

export function BookingBanner() {
  return (
    <section className="public-container public-banner">
      <div>
        <p className="public-eyebrow">DÀNH THỜI GIAN CHO SỨC KHỎE</p>
        <h2>
          Buổi khám tiếp theo,
          <br />
          bắt đầu từ một lịch hẹn.
        </h2>
        <p>Chọn bác sĩ và khoảng khám phù hợp ngay hôm nay.</p>
      </div>
      <ButtonLink appearance="public" variant="light" href="/booking">
        Đặt lịch khám <span aria-hidden="true">↗</span>
      </ButtonLink>
    </section>
  );
}
