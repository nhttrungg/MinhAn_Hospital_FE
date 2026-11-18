import { ButtonLink } from "@/components/ui/primitives";
import { CalendarCheck2, FileCheck2, MapPin, Stethoscope } from "lucide-react";

const steps = [
  {
    title: "Chọn lịch phù hợp",
    text: "Xem bác sĩ, dịch vụ và giá khám. Chọn giờ còn trống trước khi xác nhận.",
    href: "/booking",
    action: "Đặt lịch khám",
    icon: CalendarCheck2,
  },
  {
    title: "Chuẩn bị trước khi đến",
    text: "Mang giấy tờ và kết quả khám trước đây. Đến theo giờ hẹn để làm thủ tục tiếp nhận.",
    href: "/contact",
    action: "Xem đường đi",
    icon: MapPin,
  },
  {
    title: "Khám & theo dõi",
    text: "Tra cứu hướng dẫn quy trình khám và các câu hỏi thường gặp để chủ động trong buổi khám.",
    href: "/huong-dan/huong-dan-khach-hang",
    action: "Hướng dẫn đi khám",
    icon: Stethoscope,
  },
  {
    title: "Lưu giữ hồ sơ",
    text: "Xem kết quả, đơn thuốc, lịch tái khám và chứng từ của bạn hoặc người thân trong tài khoản.",
    href: "/portal/records",
    action: "Mở hồ sơ khám",
    icon: FileCheck2,
  },
];

export function CareJourney() {
  return (
    <section className="public-journey">
      <div className="public-container public-section">
        <div className="public-section-heading">
          <div>
            <p className="public-eyebrow">ĐỒNG HÀNH TRƯỚC VÀ SAU BUỔI KHÁM</p>
            <h2>Mỗi bước đều rõ ràng</h2>
            <p>Từ chọn lịch đến xem kết quả, Minh An giúp bạn chủ động chăm sóc sức khỏe.</p>
          </div>
        </div>
        <div className="public-journey-grid">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <article key={step.title} className="public-journey-item">
                <div className="public-journey-head" aria-hidden="true">
                  <span className="public-journey-num">{String(index + 1).padStart(2, "0")}</span>
                  <span className="public-journey-icon">
                    <StepIcon size={18} strokeWidth={1.8} />
                  </span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <ButtonLink appearance="public" variant="text" href={step.href}>
                  {step.action} →
                </ButtonLink>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
