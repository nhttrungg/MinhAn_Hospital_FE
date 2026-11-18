"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  Search,
  Stethoscope,
  Clock,
  MapPin,
  Phone,
} from "lucide-react";
import {
  ButtonLink,
  Button,
  Form,
  Label,
  TextInput,
  SelectInput,
} from "@/components/ui/primitives";
import { useClinic, useDirectory, uniqueDoctors, phoneHref } from "@/lib/public-clinic";
import { BookingBanner, DoctorCard, LoadingState, PublicEmpty, SpecialtyCard } from "./public-ui";
import { InfoItem } from "./public-info-item";
import { CareJourney } from "./care-journey";
export function CustomerHome() {
  const { doctors, specialties } = useDirectory();
  const clinic = useClinic();
  const people = uniqueDoctors(doctors.data ?? []);
  return (
    <main className="public-home">
      <section className="public-hero">
        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <p className="public-eyebrow">
              <span className="live-dot" /> {clinic.data?.name ?? "Bệnh viện Minh An"}
            </p>
            <h1>
              An tâm hôm nay.
              <br />
              <em>Khỏe mạnh mỗi ngày.</em>
            </h1>
            <p>
              Chăm sóc tận tâm, đồng hành cùng bạn và gia đình.
              <br className="desktop-break" /> Tìm bác sĩ và đặt lịch phù hợp để chủ động chăm sóc
              sức khỏe.
            </p>
            <div className="hero-actions">
              <ButtonLink appearance="public" variant="primary" href="/booking">
                <CalendarDays size={19} aria-hidden /> Đặt lịch khám{" "}
                <ArrowUpRight size={18} aria-hidden />
              </ButtonLink>
              <ButtonLink appearance="public" variant="text" href="/doctors">
                Gặp đội ngũ bác sĩ <ArrowUpRight size={17} aria-hidden />
              </ButtonLink>
            </div>
            <div className="hero-assurances">
              <span>
                <b aria-hidden="true">✓</b> Chọn bác sĩ của bạn
              </span>
              <span>
                <b aria-hidden="true">✓</b> Xác nhận lịch ngay
              </span>
            </div>
            <div className="public-hero-counts" aria-label="Danh mục khám đang công bố">
              <div>
                <strong>{doctors.isSuccess ? people.length : "—"}</strong>
                <span>Bác sĩ đồng hành</span>
              </div>
              <div>
                <strong>{specialties.isSuccess ? specialties.data.length : "—"}</strong>
                <span>Chuyên khoa</span>
              </div>
            </div>
          </div>
          <div className="public-hero-visual">
            <div className="hero-visual-label">
              <HeartPulse size={16} aria-hidden /> Tận tâm trong từng lần thăm khám
            </div>
            <Image
              src="/images/clinic/hero.jpg"
              alt="Bác sĩ trong không gian phòng khám sáng và thân thiện"
              fill
              sizes="(max-width: 760px) 100vw, 48vw"
              preload
              className="hero-photo"
            />
            <div className="hero-image-caption">
              <span aria-hidden="true">
                <HeartPulse size={23} />
              </span>
              <div>
                <strong>Chăm sóc tận tâm</strong>
                <p>Đồng hành trong từng lần thăm khám</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="public-container home-search-section" aria-label="Tìm bác sĩ">
        <Form action="/doctors" className="home-search">
          <div>
            <span className="public-eyebrow">BẮT ĐẦU TỪ ĐÂY</span>
            <h2>Bạn cần khám gì?</h2>
          </div>
          <Label>
            <span>Tên bác sĩ hoặc dịch vụ</span>
            <TextInput
              appearance="custom"
              name="keyword"
              type="search"
              placeholder="Nhập tên bác sĩ, dịch vụ…"
            />
          </Label>
          <Label>
            <span>Chuyên khoa</span>
            <SelectInput appearance="custom" name="specialtyId" defaultValue="">
              <option value="">Tất cả chuyên khoa</option>
              {specialties.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          </Label>
          <Button appearance="public" variant="primary" type="submit">
            <Search size={18} aria-hidden /> Tìm bác sĩ
          </Button>
        </Form>
      </section>
      <nav className="public-container home-shortcuts" aria-label="Tiện ích khám bệnh">
        {[
          {
            href: "/booking",
            icon: CalendarDays,
            title: "Đặt lịch khám",
            text: "Chọn thời gian thuận tiện cho bạn",
          },
          {
            href: "/doctors",
            icon: Stethoscope,
            title: "Tìm bác sĩ",
            text: "Gặp người đồng hành phù hợp",
          },
          {
            href: "/portal/records",
            icon: ClipboardList,
            title: "Hồ sơ sức khỏe",
            text: "Xem kết quả và lịch sử thăm khám",
          },
        ].map((item) => (
          <Link prefetch={false} href={item.href} key={item.href} className="home-shortcut">
            <span className="home-shortcut-icon">
              <item.icon size={23} aria-hidden />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        ))}
      </nav>
      {clinic.data && (clinic.data.phone || clinic.data.address || clinic.data.workingHours) && (
        <section className="public-container public-info-strip" aria-label="Thông tin cơ sở">
          {clinic.data.phone && (
            <InfoItem icon={<Phone size={20} />} label="Liên hệ đặt khám">
              <a href={phoneHref(clinic.data.phone)}>{clinic.data.phone}</a>
            </InfoItem>
          )}
          {clinic.data.workingHours && (
            <InfoItem icon={<Clock size={20} />} label="Giờ làm việc">
              {clinic.data.workingHours}
            </InfoItem>
          )}
          {clinic.data.address && (
            <InfoItem icon={<MapPin size={20} />} label="Địa chỉ">
              {clinic.data.address}
            </InfoItem>
          )}
        </section>
      )}
      <section className="public-container public-section">
        <div className="public-section-heading">
          <div>
            <p className="public-eyebrow">CHĂM SÓC THEO NHU CẦU</p>
            <h2>Khám theo chuyên khoa</h2>
            <p>Chọn chuyên khoa để tìm bác sĩ và lịch khám phù hợp.</p>
          </div>
          <ButtonLink appearance="public" variant="text" href="/specialties">
            Tất cả chuyên khoa →
          </ButtonLink>
        </div>
        <LoadingState
          error={specialties.isError || doctors.isError}
          loading={specialties.isLoading || doctors.isLoading}
          retry={() => {
            void specialties.refetch();
            void doctors.refetch();
          }}
          skeleton="specialty"
          count={4}
        />
        <div className="public-specialty-grid">
          {specialties.data?.slice(0, 6).map((item) => (
            <SpecialtyCard
              key={item.id}
              specialty={item}
              count={people.filter((doctor) => doctor.specialtyId === item.id).length}
            />
          ))}
        </div>
        {specialties.data?.length === 0 && (
          <PublicEmpty title="Chưa có chuyên khoa được công bố">
            Vui lòng quay lại sau hoặc liên hệ cơ sở để được hỗ trợ.
          </PublicEmpty>
        )}
      </section>
      <section className="public-doctors-section">
        <div className="public-container public-section">
          <div className="public-section-heading">
            <div>
              <p className="public-eyebrow">GẶP NGƯỜI ĐỒNG HÀNH CÙNG BẠN</p>
              <h2>Đội ngũ bác sĩ</h2>
              <p>Tìm hiểu bác sĩ trước khi lựa chọn lịch khám của bạn.</p>
            </div>
            <ButtonLink appearance="public" variant="text" href="/doctors">
              Xem tất cả bác sĩ →
            </ButtonLink>
          </div>
          <LoadingState
            error={doctors.isError}
            loading={doctors.isLoading}
            retry={() => {
              void doctors.refetch();
            }}
            skeleton="doctor"
          />
          <div className="public-doctor-grid">
            {people.slice(0, 6).map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} services={doctors.data ?? []} />
            ))}
          </div>
          {doctors.data?.length === 0 && (
            <PublicEmpty title="Chưa có bác sĩ được công bố">
              Vui lòng quay lại sau hoặc liên hệ cơ sở để được hỗ trợ.
            </PublicEmpty>
          )}
        </div>
      </section>
      <CareJourney />
      <BookingBanner />
    </main>
  );
}
