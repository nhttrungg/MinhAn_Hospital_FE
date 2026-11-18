"use client";
import Link from "next/link";
import { Clock, MapPin, Phone, Siren } from "lucide-react";
import { phoneHref, useClinic } from "@/lib/public-clinic";
import { Brand } from "./public-header";
export function PublicFooter() {
  const clinic = useClinic();
  const emergency = clinic.data?.contactPhones?.find((contact) => contact.code === "EMERGENCY");
  return (
    <footer className="at-public-footer">
      <div className="at-public-container">
        <div className="public-footer-emergency">
          <Siren size={22} aria-hidden="true" />
          <p>
            <strong>Cấp cứu (24/24)</strong> — gọi{" "}
            <a href={phoneHref(emergency?.phone ?? "115")}>{emergency?.phone ?? "115"}</a> hoặc đến
            cơ sở cấp cứu gần nhất. Đặt lịch trực tuyến không dành cho tình huống nguy kịch.
          </p>
        </div>
        <div className="at-footer-grid">
          <div>
            <Brand />
            <p>{clinic.data?.name ?? "Bệnh viện Minh An"}</p>
            <p>Chủ động chọn bác sĩ, đặt lịch và theo dõi sức khỏe của bạn.</p>
          </div>
          <div>
            <h2>Khám tại Minh An</h2>
            <Link prefetch={false} href="/specialties">
              Chuyên khoa
            </Link>
            <Link prefetch={false} href="/doctors">
              Đội ngũ bác sĩ
            </Link>
            <Link prefetch={false} href="/booking">
              Đặt lịch khám
            </Link>
            <Link prefetch={false} href="/about">
              Giới thiệu
            </Link>
          </div>
          <div>
            <h2>Dành cho bạn</h2>
            <Link prefetch={false} href="/portal">
              Lịch hẹn của tôi
            </Link>
            <Link prefetch={false} href="/portal/records">
              Kết quả khám
            </Link>
            <Link prefetch={false} href="/faq">
              Hướng dẫn và hỏi đáp
            </Link>
            <Link prefetch={false} href="/contact">
              Liên hệ
            </Link>
          </div>
          <div>
            <h2>Thông tin cơ sở</h2>
            <p className="public-footer-line">
              <Clock size={15} aria-hidden="true" />
              <span>
                <strong>Giờ làm việc:</strong>{" "}
                {clinic.data?.workingHours || "Xem lịch khám đã công bố của từng bác sĩ."}
              </span>
            </p>
            {clinic.data?.address && (
              <p className="public-footer-line">
                <MapPin size={15} aria-hidden="true" />
                <span>{clinic.data.address}</span>
              </p>
            )}
            {clinic.data?.phone && (
              <a className="public-footer-line" href={phoneHref(clinic.data.phone)}>
                <Phone size={15} aria-hidden="true" />
                <span>{clinic.data.phone}</span>
              </a>
            )}
            {clinic.data?.email && <a href={`mailto:${clinic.data.email}`}>{clinic.data.email}</a>}
            {clinic.data?.website && (
              <a href={clinic.data.website} target="_blank" rel="noopener noreferrer">
                Website bệnh viện ↗
              </a>
            )}
          </div>
        </div>
        <div className="at-footer-bottom">
          <div>
            <span>Minh An Clinic · Đồng hành cùng sức khỏe của bạn</span>
            <small>
              Thông tin trên website chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.
            </small>
          </div>
          <nav className="public-footer-legal" aria-label="Liên kết chân trang">
            <Link prefetch={false} href="/huong-dan/cach-dat-lich">
              Hướng dẫn đặt lịch
            </Link>
            <Link prefetch={false} href="/faq">
              Hỏi đáp
            </Link>
            <Link prefetch={false} href="/login/staff">
              Khu nhân viên ↗
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
