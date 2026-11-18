"use client";
import type { Encounter } from "@/lib/outpatient";
import type { PageResult } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { FilterBar } from "@/components/ui/data-display";
import { Card, Field, TextInput, ButtonLink, Pager } from "@/components/ui/primitives";
import { QueryState } from "@/components/workspace-ui";
type HistoryFilter = { from: string; to: string; page: number };
export function EncounterHistory({
  filter,
  onFilter,
  data,
  loading,
  error,
}: {
  filter: HistoryFilter;
  onFilter: (filter: HistoryFilter) => void;
  data?: PageResult<Encounter>;
  loading: boolean;
  error: Error | null;
}) {
  return (
    <Card className="no-print space-y-3">
      <h2 className="font-semibold">Lịch sử khám của bệnh nhân</h2>
      <FilterBar appearance="custom" className="grid gap-3 sm:grid-cols-2">
        <Field label="Lịch sử từ ngày">
          <TextInput
            type="date"
            value={filter.from}
            onChange={(e) => onFilter({ ...filter, from: e.target.value, page: 0 })}
          />
        </Field>
        <Field label="Lịch sử đến ngày">
          <TextInput
            type="date"
            value={filter.to}
            onChange={(e) => onFilter({ ...filter, to: e.target.value, page: 0 })}
          />
        </Field>
      </FilterBar>
      <QueryState loading={loading} error={error} empty={data?.content.length === 0} />
      {data?.content
        .filter((e) => e.status === "COMPLETED")
        .map((e) => (
          <p key={e.id}>
            <ButtonLink
              variant="ghost"
              className="max-w-full whitespace-normal text-left"
              style={{ whiteSpace: "normal" }}
              href={`/staff/encounters/${e.id}`}
            >
              {formatDateTime(e.completedAt)} · {e.doctorName} · {e.diagnosis}
            </ButtonLink>
          </p>
        ))}
      <Pager
        page={filter.page}
        totalPages={data?.totalPages ?? 0}
        onPage={(page) => onFilter({ ...filter, page })}
      />
    </Card>
  );
}
