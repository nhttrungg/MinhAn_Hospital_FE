"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  Wallet,
  Building2,
  DoorOpen,
  BriefcaseMedical,
  Pill,
  Settings,
  History,
  Mail,
  KeyRound,
  ClipboardList,
  UserRoundCog,
  BedDouble,
  type LucideIcon,
} from "lucide-react";
import type { CurrentUser } from "@/lib/types";
export type StaffNavItem = { href: string; label: string; icon: LucideIcon };
export function staffGroups(user: CurrentUser): { label: string; items: StaffNavItem[] }[] {
  const admin = user.roles.includes("ADMIN");
  const doctor = user.roles.includes("DOCTOR");
  const reception = user.roles.includes("RECEPTIONIST");
  const nurse = user.roles.includes("NURSE");
  const cashier = user.roles.includes("CASHIER");
  const pharmacist = user.roles.includes("PHARMACIST");
  const lab = user.roles.includes("LAB_TECH");
  return [
    {
      label: "Không gian làm việc",
      items: [{ href: "/staff", label: "Tổng quan", icon: LayoutDashboard }],
    },
    {
      label: "Vận hành",
      items: [
        ...(admin || pharmacist || cashier
          ? [{ href: "/staff/pharmacy", label: "Quầy thuốc", icon: Pill }]
          : []),
        ...(admin || lab
          ? [{ href: "/staff/diagnostics", label: "Cận lâm sàng", icon: ClipboardList }]
          : []),
        ...(doctor || admin
          ? [{ href: "/staff/schedules", label: "Lịch bác sĩ", icon: CalendarDays }]
          : []),
        ...(doctor ? [{ href: "/staff/queue", label: "Bàn khám", icon: Stethoscope }] : []),
        ...(nurse
          ? [{ href: "/staff/nursing", label: "Lượt được phân công", icon: ClipboardList }]
          : []),
        ...(reception
          ? [
              { href: "/staff/appointments", label: "Tiếp nhận", icon: ClipboardList },
              { href: "/staff/patients", label: "Hồ sơ bệnh nhân", icon: Users },
            ]
          : []),
        ...(admin
          ? [
              { href: "/staff/reviews", label: "Đánh giá sau khám", icon: ClipboardList },
              {
                href: "/staff/appointments-overview",
                label: "Theo dõi lịch hẹn",
                icon: ClipboardList,
              },
            ]
          : []),
        ...(cashier || admin
          ? [
              {
                href: "/staff/billing",
                label: cashier ? "Thu phí" : "Theo dõi hóa đơn",
                icon: Wallet,
              },
            ]
          : []),
      ],
    },
    {
      label: "Nhân sự và danh mục",
      items: admin
        ? [
            { href: "/staff/accounts", label: "Nhân viên và bác sĩ", icon: UserRoundCog },
            { href: "/staff/departments", label: "Khoa", icon: Building2 },
            { href: "/staff/specialties", label: "Chuyên khoa", icon: Stethoscope },
            { href: "/staff/rooms", label: "Phòng", icon: DoorOpen },
            { href: "/staff/services", label: "Dịch vụ và giá", icon: BriefcaseMedical },
            { href: "/staff/medications", label: "Thuốc kê đơn", icon: Pill },
            { href: "/staff/beds", label: "Danh mục giường", icon: BedDouble },
          ]
        : [],
    },
    {
      label: "Báo cáo",
      items: admin
        ? [{ href: "/staff/reports", label: "Báo cáo ngoại trú", icon: LayoutDashboard }]
        : [],
    },
    {
      label: "Hệ thống",
      items: [
        ...(admin
          ? [
              { href: "/staff/chatbot", label: "Cấu hình chatbot", icon: Settings },
              { href: "/staff/knowledge", label: "Kho kiến thức", icon: BriefcaseMedical },
              { href: "/staff/settings", label: "Thông tin cơ sở", icon: Settings },
              { href: "/staff/audit", label: "Nhật ký thao tác", icon: History },
              { href: "/staff/email-tasks", label: "Email", icon: Mail },
            ]
          : []),
        { href: "/staff/password", label: "Đổi mật khẩu", icon: KeyRound },
        { href: "/staff/security", label: "Bảo mật tài khoản", icon: KeyRound },
      ],
    },
  ].filter((g) => g.items.length);
}
export function StaffNavigation({
  user,
  onNavigate,
}: {
  user: CurrentUser;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const alerts = useQuery({
    queryKey: ["pharmacy-alerts", "navigation"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ total: number }>("/api/v1/pharmacy/alerts", { signal }),
    enabled: user.roles.some((role) => role === "ADMIN" || role === "PHARMACIST"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  return (
    <nav className="at-sidebar-nav" aria-label="Điều hướng nhân viên">
      {staffGroups(user).map((group) => (
        <div className="at-sidebar-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="at-sidebar-link"
              aria-current={
                (item.href === "/staff" ? path === item.href : path.startsWith(item.href))
                  ? "page"
                  : undefined
              }
              onClick={onNavigate}
              title={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.href === "/staff/pharmacy" && !!alerts.data?.total && (
                <span
                  className="rounded-full bg-amber-100 px-2 text-xs text-amber-900"
                  aria-label={`${alerts.data.total} cảnh báo thuốc`}
                >
                  {alerts.data.total}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
