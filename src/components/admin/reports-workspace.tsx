"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, PageHeader, FilterBar } from "@/components/ui/data-display";
import { api, queryString, allOptions } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import type { Doctor, ClinicalService } from "@/lib/types";
import { vietnamDate, type Report } from "@/lib/outpatient";
import { Card, Field, SelectInput, TextInput, ButtonLink } from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";
import { CapacityPanel } from "./operations-parts";

export function ReportsWorkspace() {
  const [filters, setFilters] = useState({
    from: vietnamDate(-30),
    to: vietnamDate(),
    doctorId: "",
    serviceId: "",
  });
  const query = queryString(filters);
  const report = useQuery({
    queryKey: ["reports", filters],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Report>(`/api/v1/reports/outpatient${query}`, { signal }),
  });
  const doctors = useQuery({
    queryKey: ["staff-doctor-references"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Pick<Doctor, "id" | "fullName">[]>("/api/v1/schedules/doctors", { signal }),
  });
  const services = useQuery({
    queryKey: ["services", "report"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<ClinicalService>("/api/v1/catalog/services", { signal }),
  });
  const cards = [
    ["booked", "Lịch đặt"],
    ["checkedIn", "Đã tiếp nhận"],
    ["completed", "Hoàn tất"],
    ["cancelled", "Hủy"],
    ["noShow", "Vắng hẹn"],
    ["revenue", "Thực thu"],
    ["balance", "Công nợ"],
  ] as const;
  type DoctorReport = Report["doctors"][number] & { id: number };
  const columns: ColumnDef<DoctorReport>[] = [
    {
      id: "doctor",
      header: "Bác sĩ",
      size: 250,
      cell: ({ row }) => <span className="font-semibold">{row.original.doctorName}</span>,
    },
    ...(
      [
        ["booked", "Lịch đặt"],
        ["checkedIn", "Tiếp nhận"],
        ["completed", "Hoàn tất"],
        ["cancelled", "Hủy"],
        ["noShow", "Vắng hẹn"],
      ] as const
    ).map(([key, label]) => ({
      id: key,
      header: label,
      size: 100,
      cell: ({ row }: { row: { original: DoctorReport } }) => row.original[key],
    })),
    {
      id: "rating",
      header: "Điểm đánh giá",
      size: 150,
      cell: ({ row }) =>
        row.original.ratingAverage == null
          ? "Chưa có"
          : `${row.original.ratingAverage.toFixed(1)} / 5 (${row.original.ratingCount})`,
    },
    {
      id: "rate",
      header: "Hoàn tất / tiếp nhận",
      size: 170,
      cell: ({ row }) =>
        `${row.original.checkedIn ? Math.round((row.original.completed * 100) / row.original.checkedIn) : 0}%`,
    },
  ];
  return (
    <>
      <CapacityPanel />
      <PageHeader
        eyebrow="Báo cáo"
        title="Báo cáo ngoại trú"
        description="Lượt khám theo ngày hẹn; thực thu theo ngày ghi nhận phiếu thu. Công nợ là số còn thiếu của các lượt trong khoảng chọn."
      />
      <FilterBar appearance="custom" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Từ ngày">
          <TextInput
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </Field>
        <Field label="Bác sĩ">
          <SelectInput
            value={filters.doctorId}
            onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}
          >
            <option value="">Tất cả</option>
            {[...new Map(doctors.data?.map((d) => [d.id, d])).values()].map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Dịch vụ">
          <SelectInput
            value={filters.serviceId}
            onChange={(e) => setFilters({ ...filters, serviceId: e.target.value })}
          >
            <option value="">Tất cả</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      <QueryState
        loading={doctors.isLoading}
        error={doctors.error}
        retry={() => void doctors.refetch()}
      />
      <QueryState
        loading={services.isLoading}
        error={services.error}
        retry={() => void services.refetch()}
      />
      <QueryState
        loading={report.isLoading}
        error={report.error}
        retry={() => void report.refetch()}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, label]) => (
          <Card key={key}>
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="text-2xl font-semibold">
              {report.data
                ? key === "revenue" || key === "balance"
                  ? formatVnd(report.data[key])
                  : report.data[key]
                : "…"}
            </p>
          </Card>
        ))}
      </div>
      <ButtonLink
        variant="ghost"
        href={`/api/v1/reports/outpatient.csv${query}`}
        download="bao-cao-ngoai-tru.csv"
      >
        Xuất CSV
      </ButtonLink>
      {report.data && (
        <DataTable
          fitColumns
          className="at-catalog-table"
          columns={columns}
          data={report.data.doctors.map((row) => ({ ...row, id: row.doctorId }))}
        />
      )}
    </>
  );
}
