"use client";
import { PageHeader, FilterBar } from "@/components/ui/data-display";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, queryString } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { vietnamDate, type Encounter } from "@/lib/outpatient";
import type { PageResult } from "@/lib/types";
import { Card, Field, Pager, TextInput, ButtonLink } from "@/components/ui";
import { DiagnosticsWorkspace } from "@/components/admin/diagnostics-workspace";
import { QueryState, useUser } from "@/components/workspace-ui";
import { FamilyPatientFilter } from "./family-patient-filter";

export function PortalRecords() {
  const me = useUser();
  const [filters, setFilters] = useState({ from: vietnamDate(-365), to: vietnamDate() });
  const [page, setPage] = useState(0);
  const [patientId, setPatientId] = useState(0);
  const list = useQuery({
    queryKey: ["records", me.data?.id, filters, patientId, page],
    enabled: me.data?.userType === "PATIENT",
    queryFn: ({ signal }) =>
      api<PageResult<Encounter>>(
        `/api/v1/encounters/search${queryString({ ...filters, patientId: patientId || null, page, size: 20 })}`,
        { signal },
      ),
  });
  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Hồ sơ sức khỏe"
        title={<>Lịch sử khám của tôi và người thân</>}
        description="Chỉ các lượt đã hoàn tất. Bệnh án nháp, đơn chưa chốt và kết quả chưa công bố không hiện ở đây."
      />
      <FilterBar appearance="custom" className="grid gap-3 sm:grid-cols-3">
        <FamilyPatientFilter
          value={patientId}
          onChange={(id) => {
            setPatientId(id);
            setPage(0);
          }}
        />
        <Field label="Từ ngày">
          <TextInput
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters({ ...filters, from: e.target.value });
              setPage(0);
            }}
          />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters({ ...filters, to: e.target.value });
              setPage(0);
            }}
          />
        </Field>
      </FilterBar>
      <QueryState
        loading={list.isLoading}
        error={list.error}
        retry={() => void list.refetch()}
        empty={list.data?.content.length === 0}
        emptyTitle="Chưa có lượt khám hoàn tất"
        emptyDescription="Sau khi bác sĩ hoàn tất bệnh án, kết quả và đơn thuốc hiện tại đây."
      />
      {list.data?.content.map((e) => (
        <Card key={e.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base">
                {e.doctorName} · <span className="text-muted font-normal">{e.appointmentCode}</span>
              </h2>
              <p className="text-sm text-muted mt-1">
                Người khám: <strong className="text-ink">{e.patientName}</strong> ·{" "}
                {formatDateTime(e.completedAt)}
              </p>
            </div>
            <ButtonLink href={`/portal/records/${e.id}`} variant="ghost">
              Bệnh án và đơn thuốc →
            </ButtonLink>
          </div>
          {e.diagnosis && <p className="text-sm">Chẩn đoán: {e.diagnosis}</p>}
          {e.followUpDate && (
            <p className="text-sm font-medium text-brand">
              Hẹn tái khám: {e.followUpDate.split("-").reverse().join("/")}
            </p>
          )}
        </Card>
      ))}
      <Pager page={page} totalPages={list.data?.totalPages ?? 0} onPage={setPage} />
      <DiagnosticsWorkspace portal />
    </main>
  );
}
