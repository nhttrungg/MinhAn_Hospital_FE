"use client";
import { ButtonLink } from "@/components/ui/primitives";
import { CalendarDays, Phone, Stethoscope, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useDoctorAvailability } from "@/hooks/use-doctor-availability";
import { formatVnd } from "@/lib/format";
import { useClinic, useDirectory, uniqueDoctors } from "@/lib/public-clinic";
import { DescriptionContent } from "./description-content";
import { DoctorPortrait } from "./doctor-portrait";
import { DoctorReviews } from "./doctor-reviews";
import type { RatedDoctor } from "@/lib/engagement-types";
import { BookingBanner, DoctorCard, LoadingState, PageHeading, PublicEmpty } from "./public-ui";

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="public-fact">
      <span aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function Availability({ doctorId }: { doctorId: number }) {
  const availability = useDoctorAvailability(doctorId);
  const days = availability.data?.slice(0, 5) ?? [];
  return (
    <section className="public-availability" aria-labelledby="doctor-availability">
      <h2 id="doctor-availability">Lịch khám sắp tới</h2>
      <LoadingState
        error={availability.isError}
        loading={availability.isLoading}
        retry={() => void availability.refetch()}
        skeleton="text"
      />
      {availability.isSuccess && days.length === 0 && (
        <p className="public-caption">
          Chưa có khoảng khám nào được công bố trong 14 ngày tới. Vui lòng quay lại sau hoặc liên hệ
          cơ sở để được hỗ trợ.
        </p>
      )}
      {days.length > 0 && (
        <ul className="public-availability-list">
          {days.map((day) => (
            <li key={day.date}>
              <div className="public-availability-day">
                <strong>{day.label}</strong>
                <span>{day.total} khoảng trống</span>
              </div>
              <div className="public-slot-list">
                {day.times.slice(0, 6).map((time) => (
                  <Link
                    key={time}
                    className="public-slot"
                    href={`/booking?doctorId=${doctorId}&date=${day.date}`}
                    aria-label={`Đặt khám lúc ${time} ngày ${day.label}`}
                  >
                    {time}
                  </Link>
                ))}
                {day.times.length > 6 && (
                  <Link
                    className="public-slot more"
                    href={`/booking?doctorId=${doctorId}&date=${day.date}`}
                  >
                    +{day.times.length - 6} giờ khác
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DirectoryDetail({ id, kind }: { id: number; kind: "doctor" | "specialty" }) {
  const { doctors, specialties } = useDirectory();
  const clinic = useClinic();
  const doctor = doctors.data?.find((item) => item.id === id) as RatedDoctor | undefined;
  const specialty = specialties.data?.find(
    (item) => item.id === (kind === "doctor" ? doctor?.specialtyId : id),
  );
  const missing = kind === "doctor" ? !doctor : !specialty;
  const listCrumb =
    kind === "doctor"
      ? { label: "Đội ngũ bác sĩ", href: "/doctors" }
      : { label: "Chuyên khoa", href: "/specialties" };
  if (doctors.isLoading || specialties.isLoading || doctors.isError || specialties.isError)
    return (
      <main>
        <PageHeading
          eyebrow={kind === "doctor" ? "Hồ sơ bác sĩ" : "Thông tin chuyên khoa"}
          title={kind === "doctor" ? "Hồ sơ bác sĩ" : "Thông tin chuyên khoa"}
          crumbs={[listCrumb, { label: "Đang tải…" }]}
        />
        <div className="public-container public-section">
          <LoadingState
            error={doctors.isError || specialties.isError}
            loading={doctors.isLoading || specialties.isLoading}
            retry={() => {
              void doctors.refetch();
              void specialties.refetch();
            }}
            skeleton="text"
          />
        </div>
      </main>
    );
  if (missing)
    return (
      <main className="public-container public-section">
        <PublicEmpty
          heading="h1"
          title={`Không tìm thấy ${kind === "doctor" ? "bác sĩ" : "chuyên khoa"}`}
          action={
            <>
              <ButtonLink
                appearance="public"
                variant="primary"
                href={kind === "doctor" ? "/doctors" : "/specialties"}
              >
                {kind === "doctor" ? "Xem đội ngũ bác sĩ" : "Xem tất cả chuyên khoa"}
              </ButtonLink>
              <ButtonLink appearance="public" variant="text" href="/">
                Về trang chủ →
              </ButtonLink>
            </>
          }
        >
          Thông tin có thể đã ngừng công bố.
        </PublicEmpty>
      </main>
    );
  const services = (doctors.data ?? []).filter((item) =>
    kind === "doctor" ? item.id === id : item.specialtyId === id,
  );
  const serviceList = [...new Map(services.map((item) => [item.serviceId, item])).values()];
  const prices = services.filter((item) => item.price !== null).map((item) => Number(item.price));
  const fromPrice = prices.length ? formatVnd(String(Math.min(...prices))) : "Liên hệ cơ sở";
  const colleagues = uniqueDoctors(doctors.data ?? []).filter(
    (item) => item.specialtyId === specialty?.id && (kind !== "doctor" || item.id !== id),
  );
  const bookingHref = `/booking?${kind === "doctor" ? "doctorId" : "specialtyId"}=${id}`;
  const name = kind === "doctor" ? doctor!.fullName : specialty!.name;
  return (
    <main>
      <PageHeading
        eyebrow={kind === "doctor" ? "Hồ sơ bác sĩ" : "Thông tin chuyên khoa"}
        title={name}
        crumbs={[listCrumb, { label: name }]}
        actions={
          <ButtonLink appearance="public" variant="primary" href={bookingHref}>
            <CalendarDays size={17} aria-hidden="true" /> Đặt lịch khám
          </ButtonLink>
        }
      >
        {kind === "doctor"
          ? `${doctor!.title || "Bác sĩ"} · ${doctor!.specialtyName}`
          : "Khám, tư vấn và chăm sóc sức khỏe theo chuyên khoa."}
      </PageHeading>
      <section className="public-container public-section public-detail-grid">
        <div className="public-detail-main">
          {kind === "doctor" ? (
            <div className="public-doctor-profile">
              <DoctorPortrait
                name={doctor!.fullName}
                photoUrl={doctor?.photoUrl}
                className="doctor-detail-portrait"
                sizes="(max-width: 760px) 100vw, 360px"
              />
              <dl className="public-facts">
                <Fact icon={<Stethoscope size={18} />} label="Chuyên khoa">
                  <Link href={`/specialties/${doctor!.specialtyId}`}>{doctor!.specialtyName}</Link>
                </Fact>
                <Fact icon={<Stethoscope size={18} />} label="Chức danh">
                  {doctor!.title || "Bác sĩ"}
                </Fact>
                <Fact icon={<CalendarDays size={18} />} label="Dịch vụ khám">
                  {serviceList.length} dịch vụ
                </Fact>
                <Fact icon={<Wallet size={18} />} label="Giá khám từ">
                  {fromPrice}
                </Fact>
              </dl>
            </div>
          ) : (
            <dl className="public-facts public-facts-row">
              <Fact icon={<Stethoscope size={18} />} label="Đội ngũ">
                {colleagues.length} bác sĩ
              </Fact>
              <Fact icon={<CalendarDays size={18} />} label="Dịch vụ khám">
                {serviceList.length} dịch vụ
              </Fact>
              <Fact icon={<Wallet size={18} />} label="Giá khám từ">
                {fromPrice}
              </Fact>
            </dl>
          )}
          <h2>Giới thiệu</h2>
          <DescriptionContent
            text={
              kind === "doctor"
                ? doctor?.bio || "Chọn dịch vụ bên dưới để xem lịch khám của bác sĩ."
                : specialty?.description ||
                  "Tìm hiểu đội ngũ bác sĩ và các dịch vụ khám của chuyên khoa."
            }
          />
          <h2>Dịch vụ khám</h2>
          <div className="public-service-list">
            {serviceList.map((item) => (
              <div key={item.serviceId}>
                <div className="public-service-content">
                  <h3>{item.serviceName}</h3>
                  {item.serviceDescription && <DescriptionContent text={item.serviceDescription} />}
                </div>
                <strong>{item.price === null ? "Liên hệ cơ sở" : formatVnd(item.price)}</strong>
              </div>
            ))}
          </div>
          {serviceList.length === 0 && (
            <p className="public-caption">Chưa có dịch vụ khám được công bố.</p>
          )}
          <p className="public-caption">
            Giá khám hiện hành theo một lượt. Tiền thuốc không nằm trong hóa đơn khám.
          </p>
          {kind === "doctor" && <Availability doctorId={id} />}
        </div>
        <aside className="public-booking-panel">
          <span className="specialty-icon" aria-hidden="true">
            <CalendarDays size={24} strokeWidth={1.8} />
          </span>
          <h2>Chọn thời gian thuận tiện</h2>
          <p>
            Mỗi khoảng khám dành riêng cho một bệnh nhân. Xem lịch đã công bố và chọn giờ phù hợp
            với bạn.
          </p>
          <ButtonLink appearance="public" variant="primary" href={bookingHref}>
            Xem lịch và đặt khám ↗
          </ButtonLink>
          <ButtonLink appearance="public" variant="text" href="/huong-dan/cach-dat-lich">
            Hướng dẫn đặt lịch →
          </ButtonLink>
          {clinic.data?.phone && (
            <a className="public-panel-phone" href={`tel:${clinic.data.phone}`}>
              <Phone size={16} aria-hidden="true" />
              <span>Cần hỗ trợ? Gọi {clinic.data.phone}</span>
            </a>
          )}
        </aside>
      </section>
      {colleagues.length > 0 && (
        <section className="public-container public-section public-section-tight">
          <div className="public-section-heading">
            <h2>{kind === "doctor" ? "Bác sĩ cùng chuyên khoa" : "Bác sĩ của chuyên khoa"}</h2>
            <span className="public-result-count">{colleagues.length} bác sĩ</span>
          </div>
          <div className="public-doctor-grid">
            {colleagues.map((item) => (
              <DoctorCard key={item.id} doctor={item} services={doctors.data ?? []} />
            ))}
          </div>
        </section>
      )}
      {kind === "doctor" && doctor && (
        <div className="public-container public-section">
          <DoctorReviews
            doctorId={id}
            ratingAverage={doctor.ratingAverage}
            ratingCount={doctor.ratingCount}
          />
        </div>
      )}
      {kind === "specialty" && colleagues.length === 0 && (
        <section className="public-container public-section public-section-tight">
          <PublicEmpty title="Chưa có bác sĩ được công bố">
            Chuyên khoa này chưa có bác sĩ nhận lịch trực tuyến.
          </PublicEmpty>
        </section>
      )}
      <BookingBanner />
    </main>
  );
}
