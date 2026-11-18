"use client";

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { allOptions } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import { roleLabels, roomTypeLabels, serviceCategoryLabels, labelOf } from "@/lib/labels";
import { Badge, Button } from "@/components/ui/primitives";
import { QueryState } from "@/components/workspace-ui";
import { DoctorPortrait } from "@/components/customer/doctor-portrait";
import type { CatalogKind, CatalogRow } from "@/lib/catalog-types";
import { CellStack } from "./admin-parts";

export const entityNames: Record<CatalogKind, string> = {
  accounts: "nhân viên",
  departments: "khoa",
  specialties: "chuyên khoa",
  rooms: "phòng",
  services: "dịch vụ",
  medications: "thuốc",
};

function Summary({ text }: { text?: string | null }) {
  const compact = text?.replace(/\s+/g, " ").trim();
  if (!compact) return <span className="at-cell-empty">Chưa có mô tả</span>;
  return (
    <span className="at-cell-summary">
      {compact.length > 110 ? `${compact.slice(0, 110).trimEnd()}…` : compact}
    </span>
  );
}

export function catalogColumns({
  kind,
  departments,
  onView,
  actions,
}: {
  kind: CatalogKind;
  departments: CatalogRow[];
  onView: (row: CatalogRow) => void;
  actions: (row: CatalogRow) => ReactNode;
}): ColumnDef<CatalogRow>[] {
  const name: ColumnDef<CatalogRow> = {
    id: "identity",
    header: kind === "accounts" ? "Nhân viên" : kind === "medications" ? "Tên thuốc" : "Tên",
    size: kind === "accounts" ? 280 : 260,
    cell: ({ row }) => (
      <>
        <Button
          appearance="custom"
          type="button"
          className="at-cell-name"
          onClick={() => onView(row.original)}
        >
          {row.original.name ?? row.original.fullName}
        </Button>
        <small className="at-cell-code">
          {[
            row.original.code ?? row.original.employeeCode,
            kind === "accounts" && row.original.title,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </>
    ),
  };
  const column = (
    id: string,
    header: string,
    cell: (row: CatalogRow) => ReactNode,
    size?: number,
  ): ColumnDef<CatalogRow> => ({ id, header, size, cell: ({ row }) => cell(row.original) });
  const info: ColumnDef<CatalogRow>[] =
    kind === "accounts"
      ? [
          column("department", "Khoa", (row) => row.departmentName || "—", 180),
          column(
            "role",
            "Vai trò",
            (row) => (
              <span className="at-cell-tag">
                {row.roles?.map((role) => labelOf(roleLabels, role)).join(", ") || "—"}
              </span>
            ),
            160,
          ),
        ]
      : kind === "services"
        ? [
            column(
              "category",
              "Nhóm",
              (row) => labelOf(serviceCategoryLabels, row.category ?? ""),
              150,
            ),
            column(
              "price",
              "Đơn giá",
              (row) => <span className="at-cell-price">{formatVnd(row.unitPrice ?? null)}</span>,
              135,
            ),
            column("unit", "Đơn vị", (row) => row.unit || "—", 85),
          ]
        : kind === "rooms"
          ? [
              column("department", "Khoa", (row) => row.departmentName || "—", 190),
              column(
                "type",
                "Loại phòng",
                (row) => labelOf(roomTypeLabels, row.roomType ?? ""),
                140,
              ),
            ]
          : kind === "medications"
            ? [
                column(
                  "ingredient",
                  "Hoạt chất / hàm lượng",
                  (row) => <CellStack meta={row.strength}>{row.ingredient}</CellStack>,
                  220,
                ),
                column(
                  "form",
                  "Dạng / đơn vị",
                  (row) => <CellStack meta={row.unit}>{row.form}</CellStack>,
                  145,
                ),
              ]
            : kind === "specialties"
              ? [
                  column(
                    "department",
                    "Khoa",
                    (row) =>
                      departments.find((department) => department.id === row.departmentId)?.name ??
                      "—",
                    180,
                  ),
                  column("summary", "Mô tả ngắn", (row) => <Summary text={row.description} />, 260),
                ]
              : [column("summary", "Mô tả ngắn", (row) => <Summary text={row.description} />, 350)];
  return [
    name,
    ...info,
    column("active", "Trạng thái", (row) => <Badge active={row.active} />, 150),
    column("actions", "Thao tác", actions, 140),
  ];
}

function DetailSection({ title, items }: { title: string; items: [string, ReactNode][] }) {
  const visible = items.filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!visible.length) return null;
  return (
    <section className="at-catalog-detail-section">
      <h3>{title}</h3>
      <dl className="at-catalog-detail-grid">
        {visible.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CatalogDetails({
  row,
  kind,
  departments,
}: {
  row: CatalogRow;
  kind: CatalogKind;
  departments: CatalogRow[];
}) {
  const doctor = kind === "accounts" && row.roles?.includes("DOCTOR");
  const specialties = useQuery({
    queryKey: ["specialties", "admin"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/specialties", { signal }),
    enabled: !!doctor,
  });
  const services = useQuery({
    queryKey: ["services", "exam"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/services?category=EXAMINATION", { signal }),
    enabled: !!doctor,
  });
  const description = kind === "accounts" ? row.bio : row.description;
  return (
    <div className="at-catalog-details">
      <div className="at-catalog-detail-hero">
        {kind === "accounts" && (
          <DoctorPortrait
            name={row.fullName ?? "Nhân viên"}
            photoUrl={row.photoUrl}
            className="at-detail-portrait"
            sizes="72px"
          />
        )}
        <div>
          <p className="at-cell-code">{row.code ?? row.employeeCode}</p>
          <h3>{row.name ?? row.fullName}</h3>
          {row.title && <p>{row.title}</p>}
        </div>
        <Badge active={row.active} />
      </div>
      <DetailSection
        title={kind === "accounts" ? "Thông tin cá nhân" : "Thông tin chung"}
        items={
          kind === "accounts"
            ? [
                ["Họ tên", row.fullName],
                ["Email", row.email],
                ["Điện thoại", row.phone || "Chưa cung cấp"],
                ["Tên đăng nhập", row.username],
              ]
            : [
                ["Tên", row.name],
                ["Mã", row.code],
                [
                  "Khoa",
                  row.departmentName ?? departments.find((d) => d.id === row.departmentId)?.name,
                ],
                ["Loại phòng", row.roomType ? labelOf(roomTypeLabels, row.roomType) : undefined],
              ]
        }
      />
      {kind === "accounts" && (
        <DetailSection
          title="Công việc và quyền truy cập"
          items={[
            ["Khoa", row.departmentName],
            ["Chức danh", row.title],
            ["Vai trò", row.roles?.map((role) => labelOf(roleLabels, role)).join(", ")],
            ["Mã nhân viên", row.employeeCode],
          ]}
        />
      )}
      {kind === "services" && (
        <DetailSection
          title="Phân loại và giá"
          items={[
            ["Nhóm dịch vụ", labelOf(serviceCategoryLabels, row.category ?? "")],
            ["Đơn vị", row.unit],
            ["Đơn giá", formatVnd(row.unitPrice ?? null)],
            [
              "Áp dụng từ",
              row.effectiveFrom
                ? new Intl.DateTimeFormat("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    dateStyle: "medium",
                  }).format(new Date(row.effectiveFrom))
                : undefined,
            ],
          ]}
        />
      )}
      {kind === "medications" && (
        <DetailSection
          title="Thành phần và quy cách"
          items={[
            ["Hoạt chất", row.ingredient],
            ["Hàm lượng", row.strength],
            ["Dạng thuốc", row.form],
            ["Đơn vị", row.unit],
          ]}
        />
      )}
      {doctor && (
        <>
          <QueryState
            loading={specialties.isLoading}
            error={specialties.error}
            retry={() => void specialties.refetch()}
          />
          <QueryState
            loading={services.isLoading}
            error={services.error}
            retry={() => void services.refetch()}
          />
          <DetailSection
            title="Hồ sơ chuyên môn"
            items={[
              [
                "Giới tính",
                ({ MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" } as Record<string, string>)[
                  row.gender ?? ""
                ] ?? "Chưa cung cấp",
              ],
              ["Chuyên khoa", specialties.data?.find((s) => s.id === row.specialtyId)?.name],
              [
                "Dịch vụ khám",
                services.data
                  ?.filter((s) => row.serviceIds?.includes(s.id))
                  .map((s) => (
                    <span className="at-cell-tag" key={s.id}>
                      {s.name}
                    </span>
                  )),
              ],
            ]}
          />
        </>
      )}
      {description && (
        <section className="at-catalog-detail-section">
          <h3>{kind === "accounts" ? "Giới thiệu" : "Mô tả chi tiết"}</h3>
          <div className="at-catalog-description">{description}</div>
        </section>
      )}
    </div>
  );
}
