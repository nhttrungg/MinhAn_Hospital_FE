"use client";
import { PageHeader, StatCard } from "@/components/ui/data-display";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorOpen,
  BriefcaseMedical,
  Receipt,
  RefreshCw,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { api, queryString } from "@/lib/api";
import { roleLabels } from "@/lib/labels";
import { vietnamDate } from "@/lib/outpatient";
import type { DashboardSummary, PageResult } from "@/lib/types";
import { Button, ButtonLink, Card, Notice, StatusBadge } from "@/components/ui";
import { QueryState, useUser } from "@/components/workspace-ui";
import dynamic from "next/dynamic";
import { staffGroups } from "@/components/layout/staff-navigation";
import { DashboardOverview } from "./dashboard-overview";
const BottleneckPanel = dynamic(() => import("./operations-parts").then((m) => m.BottleneckPanel));

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
type Metric = { label: string; path: string; status: string; icon: LucideIcon; tone: Tone };

/** One-line purpose for each destination, shown on the quick-access tiles. */
const destinationHints: Record<string, string> = {
  "/staff/pharmacy": "Soạn đơn, cấp phát và quản lý tồn kho",
  "/staff/diagnostics": "Chỉ định, lấy mẫu và nhập kết quả",
  "/staff/schedules": "Lịch làm việc và khung giờ khám",
  "/staff/queue": "Danh sách bệnh nhân chờ khám",
  "/staff/nursing": "Đo sinh hiệu cho lượt được phân công",
  "/staff/appointments": "Tiếp nhận, cấp số và đặt lịch hộ",
  "/staff/patients": "Tạo và cập nhật hồ sơ bệnh nhân",
  "/staff/appointments-overview": "Theo dõi lịch hẹn toàn cơ sở",
  "/staff/billing": "Hóa đơn, thu tiền và in phiếu thu",
  "/staff/accounts": "Tài khoản nhân viên và bác sĩ",
  "/staff/departments": "Danh mục khoa",
  "/staff/specialties": "Danh mục chuyên khoa",
  "/staff/rooms": "Phòng khám và phòng chức năng",
  "/staff/services": "Dịch vụ và bảng giá",
  "/staff/medications": "Danh mục thuốc kê đơn",
  "/staff/beds": "Danh mục giường bệnh",
  "/staff/reports": "Báo cáo lượt khám và doanh thu",
  "/staff/chatbot": "Cấu hình trợ lý ảo",
  "/staff/knowledge": "Tài liệu cho trợ lý ảo",
  "/staff/settings": "Thông tin hiển thị của phòng khám",
  "/staff/audit": "Lịch sử thao tác trên hệ thống",
  "/staff/email-tasks": "Hàng đợi email gửi bệnh nhân",
};

export function StaffDashboard() {
  const me = useUser();
  const roles = me.data?.roles ?? [];
  const admin = roles.includes("ADMIN");
  const summary = useQuery({
    queryKey: ["dashboard-summary", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<DashboardSummary>("/api/v1/dashboard/summary", { signal }),
    enabled: me.data?.userType === "STAFF",
    refetchInterval: 30000,
  });
  const today = vietnamDate();
  const metrics: Metric[] = admin
    ? []
    : roles.includes("DOCTOR") || roles.includes("RECEPTIONIST")
      ? [
          {
            label: "Lịch hẹn hôm nay",
            path: "/api/v1/appointments/search",
            status: "",
            icon: CalendarCheck,
            tone: "neutral",
          },
          {
            label: "Chờ tiếp nhận",
            path: "/api/v1/appointments/search",
            status: "CONFIRMED",
            icon: Clock,
            tone: "warning",
          },
          {
            label: "Đã tiếp nhận",
            path: "/api/v1/appointments/search",
            status: "CHECKED_IN",
            icon: UserCheck,
            tone: "info",
          },
          {
            label: "Đã hoàn tất",
            path: "/api/v1/appointments/search",
            status: "COMPLETED",
            icon: CheckCircle2,
            tone: "success",
          },
        ]
      : roles.includes("CASHIER")
        ? [
            {
              label: "Hóa đơn hôm nay",
              path: "/api/v1/billing/search",
              status: "",
              icon: Receipt,
              tone: "neutral",
            },
            {
              label: "Chưa thu",
              path: "/api/v1/billing/search",
              status: "OPEN",
              icon: Wallet,
              tone: "danger",
            },
            {
              label: "Thu một phần",
              path: "/api/v1/billing/search",
              status: "PARTIAL",
              icon: Clock,
              tone: "warning",
            },
            {
              label: "Đã thu đủ",
              path: "/api/v1/billing/search",
              status: "PAID",
              icon: CheckCircle2,
              tone: "success",
            },
          ]
        : roles.includes("NURSE")
          ? [
              {
                label: "Lượt được phân công hôm nay",
                path: "/api/v1/encounters/assigned",
                status: "",
                icon: CalendarCheck,
                tone: "neutral",
              },
              {
                label: "Chờ khám",
                path: "/api/v1/encounters/assigned",
                status: "WAITING",
                icon: Clock,
                tone: "warning",
              },
              {
                label: "Đang khám",
                path: "/api/v1/encounters/assigned",
                status: "IN_PROGRESS",
                icon: UserCheck,
                tone: "info",
              },
              {
                label: "Đã hoàn tất",
                path: "/api/v1/encounters/assigned",
                status: "COMPLETED",
                icon: CheckCircle2,
                tone: "success",
              },
            ]
          : [];
  const counts = useQueries({
    queries: metrics.map((metric) => ({
      queryKey: ["dashboard-workload", me.data?.id, metric.path, today, metric.status],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api<PageResult<unknown>>(
          `${metric.path}${queryString({ from: today, to: today, status: metric.status, size: 1, page: 0 })}`,
          { signal },
        ),
      enabled: !!me.data,
      refetchInterval: 15000,
    })),
  });
  const cards: [keyof DashboardSummary, string, LucideIcon, Tone][] = [
    ["departments", "Khoa hoạt động", Building2, "neutral"],
    ["rooms", "Phòng hoạt động", DoorOpen, "neutral"],
    ["staff", "Nhân viên hoạt động", Users, "info"],
    ["services", "Dịch vụ hoạt động", BriefcaseMedical, "neutral"],
    ["beds", "Giường trong danh mục", BedDouble, "neutral"],
    ["bedsAvailable", "Giường đánh dấu trống", BedDouble, "success"],
  ];
  const note = roles.includes("DOCTOR")
    ? "Khám các lượt đã tiếp nhận và đã thu đủ công khám. Đơn chốt xong mới chuyển sang quầy thuốc."
    : roles.includes("RECEPTIONIST")
      ? "Tiếp nhận lịch trong ngày, cấp số thứ tự, rồi hướng bệnh nhân sang thu ngân đóng công khám."
      : roles.includes("CASHIER")
        ? "Ưu tiên hóa đơn chưa thu. Bác sĩ chỉ bắt đầu khi công khám đã thu đủ."
        : roles.includes("NURSE")
          ? "Chỉ đo sinh hiệu của lượt bác sĩ đã phân công, trước khi bệnh án hoàn tất."
          : roles.includes("PHARMACIST")
            ? "Nhận đơn đã chốt, soạn đúng lô và giao thuốc sau khi đã thu đủ tiền thuốc."
            : roles.includes("LAB_TECH")
              ? "Nhận chỉ định đã thu tiền, lấy mẫu, nhập kết quả rồi gửi duyệt để công bố."
              : "Số giường là danh mục buồng bệnh, chưa gắn với nhập viện. Báo cáo bên dưới là ngoại trú.";
  const links = me.data
    ? staffGroups(me.data)
        .flatMap((group) => group.items)
        .filter((item) => item.href !== "/staff" && item.href !== "/staff/password")
    : [];
  const countFailed = counts.some((count) => count.error);
  const refreshing = summary.isFetching || counts.some((count) => count.isFetching);
  const updatedAt = Math.max(summary.dataUpdatedAt, ...counts.map((count) => count.dataUpdatedAt));
  function refresh() {
    void summary.refetch();
    counts.forEach((count) => void count.refetch());
  }
  return (
    <>
      <PageHeader
        title={<>Xin chào, {me.data?.fullName}</>}
        description={<>{note}</>}
        meta={
          <>
            {roles.map((role) => (
              <StatusBadge key={role} tone="neutral">
                {roleLabels[role] ?? role}
              </StatusBadge>
            ))}
            {updatedAt > 0 && (
              <span>
                Cập nhật lúc{" "}
                {new Date(updatedAt).toLocaleTimeString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </>
        }
        actions={
          <Button variant="ghost" busy={refreshing} onClick={refresh}>
            {!refreshing && <RefreshCw size={16} aria-hidden />}
            Làm mới
          </Button>
        }
      />
      <QueryState
        loading={summary.isLoading}
        error={summary.error}
        retry={() => void summary.refetch()}
      />
      {me.data?.userType === "STAFF" && <DashboardOverview userId={me.data.id} />}
      {admin && <BottleneckPanel />}
      {countFailed && (
        <Notice tone="error">
          Không tải được một số số liệu trong ngày. Bấm “Làm mới” để thử lại.
        </Notice>
      )}
      {summary.data && !metrics.length && (
        <section className="at-dashboard-section" aria-label="Danh mục cơ sở">
          <h2>Danh mục cơ sở</h2>
          <div className="at-dashboard-grid">
            {cards.map(([key, label, icon, tone]) => (
              <StatCard key={key} label={label} value={summary.data[key]} icon={icon} tone={tone} />
            ))}
          </div>
        </section>
      )}
      {!!metrics.length && (
        <section className="at-dashboard-section" aria-label="Công việc hôm nay">
          <h2>
            Công việc hôm nay
            <small>
              {new Date().toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </small>
          </h2>
          <div className="at-dashboard-grid">
            {metrics.map((metric, index) => (
              <StatCard
                key={metric.label}
                label={metric.label}
                href={
                  metric.path.includes("billing")
                    ? "/staff/billing"
                    : metric.path.includes("nursing")
                      ? "/staff/nursing"
                      : roles.includes("DOCTOR")
                        ? "/staff/queue"
                        : "/staff/appointments"
                }
                icon={metric.icon}
                tone={metric.tone}
                loading={counts[index].isLoading}
                value={counts[index].data ? counts[index].data.totalElements : "—"}
              />
            ))}
          </div>
        </section>
      )}
      {!!links.length && (
        <section className="at-dashboard-section" aria-label="Truy cập nhanh">
          <h2>Truy cập nhanh</h2>
          <div className="at-quick-links">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="at-quick-link"
                aria-label={`${item.label} →`}
              >
                <span aria-hidden>
                  <item.icon size={20} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  {destinationHints[item.href] && <small>{destinationHints[item.href]}</small>}
                </span>
                <ChevronRight size={18} aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}
      {admin && (
        <Card className="no-print flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Báo cáo ngoại trú</h2>
            <p className="text-sm text-muted">
              Lượt khám, doanh thu, hiệu quả bác sĩ và công suất theo cùng bộ lọc.
            </p>
          </div>
          <ButtonLink href="/staff/reports" variant="ghost">
            Mở báo cáo <ChevronRight size={16} aria-hidden />
          </ButtonLink>
        </Card>
      )}
    </>
  );
}
