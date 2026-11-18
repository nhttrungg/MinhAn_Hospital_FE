"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, ChevronRight } from "lucide-react";
import { ApiError } from "@/lib/api";
import { roleLabels } from "@/lib/labels";
import { useUser } from "@/components/workspace-ui";
import { Brand } from "./public-header";
import { AccountMenu } from "./account-menu";
import { StaffCommandSearch } from "./staff-command-search";
import { StaffNavigation, staffGroups } from "./staff-navigation";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { Drawer } from "@/components/ui/overlays";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/data-display";
import { useStaffTheme } from "@/hooks/use-staff-theme";
export function StaffShell({ children }: { children: ReactNode }) {
  useStaffTheme({ enabled: true, manageLifecycle: true });
  const me = useUser();
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401)
      router.replace(`/login/staff?next=${encodeURIComponent(path)}`);
    else if (me.data?.userType === "PATIENT") router.replace("/portal");
  }, [me.error, me.data, path, router]);
  const user = me.data;
  const groups = user && user.userType !== "PATIENT" ? staffGroups(user) : [];
  const items = groups.flatMap((g) => g.items);
  const current = items.find((i) =>
    i.href === "/staff" ? path === i.href : path.startsWith(i.href),
  );
  const title =
    current?.label ?? (path.startsWith("/staff/encounters/") ? "Bệnh án" : "Khu nhân viên");
  useEffect(() => {
    document.title = `${title} · Minh An`;
  }, [title]);
  if (!user || user.userType === "PATIENT")
    return (
      <div className="p-8">
        {me.error ? (
          <ErrorState error={me.error} retry={() => void me.refetch()} />
        ) : (
          <Skeleton rows={6} />
        )}
      </div>
    );
  const permitted =
    !!current ||
    (user.roles.some((role) => role === "DOCTOR" || role === "NURSE") &&
      path.startsWith("/staff/encounters/"));

  return (
    <div className="at-staff-shell" data-collapsed={collapsed}>
      <a href="#staff-main" className="at-skip-link">
        Bỏ qua điều hướng
      </a>
      <aside className="at-staff-sidebar">
        <div className="at-sidebar-brand">
          <Brand compact />
        </div>
        <StaffNavigation user={user} />
        <div className="at-sidebar-bottom">
          <strong>{user.roles.map((role) => roleLabels[role] ?? role).join(", ")}</strong>
          Không gian làm việc ngoại trú
        </div>
      </aside>
      <div className="min-w-0">
        <header className="at-staff-topbar">
          <div className="flex items-center gap-3">
            <Button
              appearance="custom"
              className="at-icon-button at-sidebar-toggle"
              aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </Button>
            <Button
              appearance="custom"
              className="at-icon-button at-staff-mobile-trigger"
              aria-label="Mở điều hướng"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </Button>
            <nav className="at-breadcrumb" aria-label="Vị trí hiện tại">
              <Link href="/staff" className="hidden sm:inline">
                Khu nhân viên
              </Link>
              <ChevronRight size={14} className="hidden sm:inline" aria-hidden />
              <strong aria-current="page">{title}</strong>
            </nav>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <time className="text-xs text-muted hidden md:inline">
              {new Date().toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                weekday: "long",
                day: "numeric",
                month: "numeric",
              })}
            </time>
            <StaffCommandSearch user={user} />
            <AccountMenu />
          </div>
        </header>
        <main id="staff-main" tabIndex={-1} className="at-staff-body space-y-5">
          {permitted ? (
            children
          ) : (
            <EmptyState
              title="Bạn không có quyền truy cập"
              description="Chức năng này không thuộc vai trò của tài khoản. Chọn chức năng phù hợp trong menu hoặc liên hệ quản trị viên."
              action={<ButtonLink href="/staff">Về tổng quan</ButtonLink>}
            />
          )}
        </main>
      </div>
      <Drawer
        open={mobile}
        onOpenChange={setMobile}
        title="Khu nhân viên"
        description={user.fullName}
      >
        <StaffNavigation user={user} onNavigate={() => setMobile(false)} />
      </Drawer>
    </div>
  );
}
