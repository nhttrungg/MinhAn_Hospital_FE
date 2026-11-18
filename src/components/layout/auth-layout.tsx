import "@/styles/areas/auth.css";
import { ShieldCheck, CalendarCheck, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./public-header";
export function AuthLayout({
  staff = false,
  title,
  description,
  children,
}: {
  staff?: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className={`at-auth ${staff ? "at-auth-staff" : ""}`}>
      <section className="at-auth-brand">
        <Brand />
        <div>
          <p className="at-eyebrow">
            {staff ? "KHÔNG GIAN LÀM VIỆC MINH AN" : "CHĂM SÓC SỨC KHỎE CHỦ ĐỘNG"}
          </p>
          <h2>
            {staff
              ? "Chăm sóc tận tâm.\nPhối hợp hiệu quả."
              : "Sức khỏe của bạn.\nSự an tâm của chúng tôi."}
          </h2>
          <p>
            {staff
              ? "Một nơi để quản lý lịch, tiếp nhận và đồng hành cùng người bệnh."
              : "Đặt lịch phù hợp, theo dõi buổi khám và lưu giữ kết quả của bạn tại một nơi."}
          </p>
          <ul>
            <li>
              <CalendarCheck size={20} />
              {staff ? "Lịch và công việc rõ ràng" : "Chọn bác sĩ và giờ khám thuận tiện"}
            </li>
            <li>
              <HeartPulse size={20} />
              {staff ? "Thông tin người bệnh xuyên suốt" : "Theo dõi kết quả sau mỗi buổi khám"}
            </li>
            <li>
              <ShieldCheck size={20} />
              Thông tin được bảo vệ theo quyền truy cập
            </li>
          </ul>
        </div>
        <p className="at-auth-brand-footer">Minh An Clinic · Đồng hành cùng sức khỏe của bạn</p>
      </section>
      <section className="at-auth-form">
        <div>
          <div className="at-auth-mobile-brand">
            <Brand />
          </div>
          <p className="at-eyebrow">{staff ? "DÀNH CHO NHÂN VIÊN" : "TÀI KHOẢN KHÁCH HÀNG"}</p>
          <h1>{title}</h1>
          <p className="at-auth-description">{description}</p>
          <div className="at-auth-fields">{children}</div>
        </div>
      </section>
    </main>
  );
}
