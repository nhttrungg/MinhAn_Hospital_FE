"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  Receipt,
  Users,
  Clock,
  Bell,
  UserRound,
  KeyRound,
  HeartPulse,
} from "lucide-react";
import { useEventStream } from "@/hooks/use-event-stream";
import { useUser } from "@/components/workspace-ui";
import { ButtonLink } from "@/components/ui/primitives";
const sections = [
  { href: "/portal", label: "Lịch hẹn", exact: true, icon: CalendarDays },
  { href: "/portal/records", label: "Lịch sử khám", icon: ClipboardList },
  { href: "/portal/invoices", label: "Hóa đơn & thanh toán", icon: Receipt },
  { href: "/portal/family", label: "Người thân", icon: Users },
  { href: "/portal/waitlist", label: "Danh sách chờ", icon: Clock },
  { href: "/portal/notifications", label: "Thông báo", icon: Bell },
  { href: "/portal/profile", label: "Hồ sơ cá nhân", icon: UserRound },
  { href: "/portal/password", label: "Đổi mật khẩu", icon: KeyRound },
];
const liveGroups = new Set([
  "appointments",
  "appointment",
  "records",
  "encounter",
  "invoices",
  "invoice",
  "receipts",
  "notifications",
  "waitlist",
  "patient-family",
]);
export function PortalLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const cache = useQueryClient();
  const me = useUser();
  useEventStream("/api/v1/realtime/stream", () => {
    void cache.invalidateQueries({
      predicate: (query) => liveGroups.has(String(query.queryKey[0])),
    });
  });
  return (
    <div className="at-portal-page">
      <div className="at-portal-welcome no-print">
        <div>
          <p className="at-eyebrow">
            <HeartPulse size={16} aria-hidden /> SỨC KHỎE CỦA BẠN
          </p>
          <h1>Xin chào{me.data ? `, ${me.data.fullName}` : ""}</h1>
          <p>Lịch khám, kết quả và chứng từ của bạn tại một nơi.</p>
        </div>
        <ButtonLink href="/booking">
          Đặt lịch khám <CalendarDays size={17} aria-hidden />
        </ButtonLink>
      </div>
      <div className="at-portal-grid">
        <nav className="at-portal-nav no-print" aria-label="Khu vực tài khoản">
          {sections.map((item) => {
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                <item.icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="at-portal-content">{children}</div>
      </div>
    </div>
  );
}
