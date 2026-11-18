"use client";
import { InlineStatus } from "@/components/ui/data-display";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  HeartPulse,
  LogOut,
  Receipt,
  ShieldCheck,
  UserRound,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";
import { useUser } from "@/components/workspace-ui";
import { useStaffTheme } from "@/hooks/use-staff-theme";
import { api, ApiError } from "@/lib/api";
import { clearClinicalDrafts } from "@/lib/clinical-drafts";
import { roleLabels } from "@/lib/labels";
import { Avatar, Button, ButtonLink } from "@/components/ui/primitives";
export const patientAccountLinks = [
  { href: "/portal", label: "Lịch hẹn của tôi", icon: CalendarDays },
  { href: "/portal/profile", label: "Thông tin tài khoản", icon: UserRound },
  { href: "/portal/records", label: "Lịch sử và kết quả khám", icon: HeartPulse },
  { href: "/portal/invoices", label: "Hóa đơn và phiếu thu", icon: Receipt },
  { href: "/portal/notifications", label: "Thông báo", icon: Bell },
  { href: "/portal/password", label: "Mật khẩu và bảo mật", icon: ShieldCheck },
];
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const me = useUser();
  const cache = useQueryClient();
  const path = usePathname();
  const inStaffArea = Boolean(
    me.data?.userType === "STAFF" && (path === "/staff" || path.startsWith("/staff/")),
  );
  const { theme, toggleTheme } = useStaffTheme({ enabled: inStaffArea });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  if (!me.data && me.isPending)
    return (
      <InlineStatus
        className="at-account-loading"
        as="span"
        tone="info"
        aria-label="Đang tải tài khoản"
      >
        Tài khoản
        <span className="at-account-loading-dot" />
      </InlineStatus>
    );
  if (!me.data && me.error && !(me.error instanceof ApiError && me.error.status === 401))
    return (
      <Button
        appearance="custom"
        type="button"
        className="at-account-link"
        onClick={() => void me.refetch()}
        title="Không tải được tài khoản. Bấm để thử lại."
      >
        <UserRound size={18} />
        Thử lại tài khoản
      </Button>
    );
  if (!me.data)
    return (
      <ButtonLink appearance="custom" className="at-account-link" href="/login" prefetch={false}>
        <UserRound size={18} />
        Đăng nhập
      </ButtonLink>
    );
  const user = me.data;
  const staff = user.userType === "STAFF";
  const roleSummary = user.roles.map((role) => roleLabels[role] ?? role).join(", ") || "Nhân viên";
  const links = staff
    ? [
        { href: "/staff", label: "Khu nhân viên", icon: LayoutDashboard },
        { href: "/staff/password", label: "Mật khẩu và bảo mật", icon: ShieldCheck },
      ]
    : patientAccountLinks;
  async function logout() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
      await clearClinicalDrafts();
      cache.clear();
      window.location.assign(staff ? "/login/staff" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đăng xuất được. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={`at-account-trigger ${compact ? "at-account-compact" : ""}`}
        aria-label="Menu tài khoản"
      >
        <Avatar name={user.fullName} />
        <span>
          <strong>{user.fullName.split(" ").slice(-2).join(" ")}</strong>
          <small>{staff ? roleSummary : "Tài khoản của tôi"}</small>
        </span>
        <ChevronDown size={15} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="at-dropdown at-account-dropdown"
          align="end"
          sideOffset={10}
        >
          <div className="at-account-card">
            <Avatar name={user.fullName} size="large" />
            <div>
              <strong>{user.fullName}</strong>
              <small>{user.email || user.username}</small>
              <span>{staff ? "Tài khoản nhân viên" : "Khách hàng Minh An"}</span>
            </div>
          </div>
          <DropdownMenu.Group>
            {links.map((item) => (
              <DropdownMenu.Item key={item.href} asChild>
                <Link
                  href={item.href}
                  className="at-menu-item"
                  aria-current={
                    (item.href === "/portal" ? path === item.href : path.startsWith(item.href))
                      ? "page"
                      : undefined
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            ))}
            {inStaffArea && (
              <DropdownMenu.Item
                className="at-menu-item"
                onSelect={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Group>
          <DropdownMenu.Separator className="at-account-separator" />
          <DropdownMenu.Item
            disabled={busy}
            className="at-menu-item text-danger"
            onSelect={(e) => {
              e.preventDefault();
              void logout();
            }}
          >
            <LogOut size={18} />
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </DropdownMenu.Item>
          {error && (
            <InlineStatus as="p" tone="error" className="px-3 py-2 text-xs text-danger">
              {error}
            </InlineStatus>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
