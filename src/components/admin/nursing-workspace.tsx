"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import { PageHeader, FilterBar } from "@/components/ui/data-display";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, queryString } from "@/lib/api";
import { encounterLabels, vietnamDate, type Encounter } from "@/lib/outpatient";
import type { PageResult } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  Notice,
  Pager,
  SelectInput,
  TextInput,
  ButtonLink,
  Form,
} from "@/components/ui";
import { QueryState, useUser } from "@/components/workspace-ui";
import { VitalsFields } from "./vitals-fields";

export function NursingWorkspace() {
  const me = useUser();
  const [filters, setFilters] = useState({ from: vietnamDate(), to: vietnamDate(), status: "" });
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["nursing-encounters", filters, page, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Encounter>>(
        `/api/v1/encounters/assigned${queryString({ ...filters, page, size: 20 })}`,
        { signal },
      ),
    refetchInterval: 15000,
  });
  return (
    <>
      <PageHeader
        title={<>Đo sinh hiệu</>}
        description={
          <>
            Chỉ hiện lượt bác sĩ đã phân công. Ghi mạch, huyết áp, nhiệt độ, nhịp thở và SpO2 trước
            khi bệnh án được hoàn tất. Lượt đã hoàn tất chỉ xem lại.
          </>
        }
      />
      <FilterBar appearance="custom" className="grid gap-3 sm:grid-cols-3">
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
        <Field label="Trạng thái">
          <SelectInput
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(encounterLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      <QueryState
        loading={list.isLoading}
        error={list.error}
        empty={list.data?.content.length === 0}
        emptyTitle="Chưa có lượt được phân công"
        emptyDescription="Điều dưỡng không thấy cả hàng chờ. Bác sĩ phân công từng lượt trong bệnh án thì lượt đó mới hiện ở đây."
        retry={() => void list.refetch()}
      />
      {list.data?.content.map((encounter) => (
        <VitalsCard key={encounter.id} encounter={encounter} />
      ))}
      <Pager page={page} totalPages={list.data?.totalPages ?? 0} onPage={setPage} />
    </>
  );
}

function VitalsCard({ encounter }: { encounter: Encounter }) {
  const cache = useQueryClient();
  // Preserve the revision at edit time so concurrent doctor edits return 409.
  const [draft, setDraft] = useState<{ vitals: string; revision: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/v1/encounters/${encounter.id}/vitals`, {
        method: "PUT",
        body: JSON.stringify(
          draft ?? { vitals: encounter.vitals ?? "", revision: encounter.revision },
        ),
      });
      setDraft(null);
      setMessage("Đã lưu sinh hiệu.");
      await invalidateDataGroups(cache, [
        "nursing-encounters",
        "encounter",
        "doctor-queue",
        "bottlenecks",
        "dashboard-overview",
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được sinh hiệu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">
        {encounter.patientName} · {encounter.appointmentCode}
      </h2>
      <p className="text-sm">
        Bác sĩ {encounter.doctorName} · {encounterLabels[encounter.status]}
      </p>
      <ButtonLink variant="ghost" href={`/staff/encounters/${encounter.id}`}>
        Xem bệnh án
      </ButtonLink>
      {message && <Notice>{message}</Notice>}
      {encounter.status === "COMPLETED" ? (
        <p className="whitespace-pre-wrap text-sm">
          Sinh hiệu: {encounter.vitals || "Chưa ghi nhận"}
        </p>
      ) : (
        <Form onSubmit={save} className="space-y-3">
          <VitalsFields
            value={draft?.vitals ?? encounter.vitals ?? ""}
            onChange={(vitals) =>
              setDraft({ vitals, revision: draft?.revision ?? encounter.revision })
            }
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Lưu sinh hiệu
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(null);
                setMessage("");
                void cache.invalidateQueries({ queryKey: ["nursing-encounters"] });
              }}
            >
              Tải lại dữ liệu
            </Button>
          </div>
        </Form>
      )}
    </Card>
  );
}
