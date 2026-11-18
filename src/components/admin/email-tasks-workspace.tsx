"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { api, queryString } from "@/lib/api";
import { Button, Field, Notice, Pager, SearchInput, SelectInput } from "@/components/ui/primitives";
import {
  CompactText,
  DataTable,
  DetailList,
  FilterBar,
  PageHeader,
} from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import type { PageResult } from "@/lib/types";
import { QueryState } from "@/components/workspace-ui";
type EmailTask = {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string | null;
};
const labels: Record<string, string> = {
  PENDING: "Chờ gửi",
  SENDING: "Đang gửi",
  SENT: "Đã gửi",
  FAILED: "Gửi lỗi",
  SKIPPED: "Đã bỏ qua",
};
export function EmailTasksWorkspace() {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<EmailTask | null>(null);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [page, setPage] = useState(0);
  const tasks = useQuery({
    queryKey: ["email-tasks", filters, page],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<EmailTask>>(
        `/api/v1/email-tasks/search${queryString({ ...filters, page, size: 20 })}`,
        { signal },
      ),
    refetchInterval: 30000,
  });
  async function retry(task: EmailTask) {
    setBusy(true);
    setError("");
    try {
      const updated = await api<EmailTask>(`/api/v1/email-tasks/${task.id}/retry`, {
        method: "POST",
      });
      if (selected?.id === task.id) setSelected(updated);
      await cache.invalidateQueries({ queryKey: ["email-tasks"] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi lại được email.");
    } finally {
      setBusy(false);
    }
  }
  function view(task: EmailTask) {
    setError("");
    setSelected(task);
  }
  const columns: ColumnDef<EmailTask>[] = [
    {
      id: "subject",
      header: "Email",
      size: 270,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            type="button"
            className="at-cell-name"
            onClick={() => view(row.original)}
          >
            <CompactText text={row.original.subject} />
          </Button>
          <small>{row.original.recipient}</small>
        </>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      size: 135,
      cell: ({ row }) => (
        <span className="at-cell-tag">{labels[row.original.status] ?? row.original.status}</span>
      ),
    },
    { id: "attempts", header: "Số lần thử", size: 95, cell: ({ row }) => row.original.attempts },
    {
      id: "error",
      header: "Lỗi gần nhất",
      size: 240,
      cell: ({ row }) => <CompactText text={row.original.lastError} />,
    },
    {
      id: "actions",
      header: "Thao tác",
      size: 150,
      cell: ({ row }) => (
        <div className="at-catalog-row-actions">
          <Button variant="ghost" type="button" onClick={() => view(row.original)}>
            Xem
          </Button>
          {row.original.status === "FAILED" && (
            <Button type="button" disabled={busy} onClick={() => void retry(row.original)}>
              Gửi lại
            </Button>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Hệ thống"
        title="Theo dõi email"
        description="Kiểm tra trạng thái gửi và chạy lại tác vụ bị lỗi."
      />
      {error && !selected && <Notice tone="error">{error}</Notice>}
      <FilterBar
        onClear={() => {
          setFilters({ q: "", status: "" });
          setPage(0);
        }}
      >
        <SearchInput
          aria-label="Tìm email"
          placeholder="Email hoặc tiêu đề"
          value={filters.q}
          onChange={(e) => {
            setFilters({ ...filters, q: e.target.value });
            setPage(0);
          }}
        />
        <Field label="Trạng thái">
          <SelectInput
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(labels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FilterBar>
      <QueryState
        loading={tasks.isLoading}
        error={tasks.error}
        retry={() => void tasks.refetch()}
      />
      {tasks.data && (
        <>
          <DataTable
            fitColumns
            className="at-catalog-table"
            data={tasks.data.content}
            columns={columns}
          />
          <Pager
            page={page}
            totalPages={tasks.data.totalPages}
            totalElements={tasks.data.totalElements}
            onPage={setPage}
          />
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Chi tiết email"
        size="wide"
        busy={busy}
        footer={
          <>
            <DialogClose>
              <Button type="button" variant="ghost" disabled={busy}>
                Đóng
              </Button>
            </DialogClose>
            {selected?.status === "FAILED" && (
              <Button type="button" busy={busy} onClick={() => void retry(selected)}>
                Gửi lại
              </Button>
            )}
          </>
        }
      >
        {selected && (
          <div className="at-catalog-details">
            <h3 className="font-semibold">{selected.subject}</h3>
            <DetailList
              items={[
                { label: "Người nhận", value: selected.recipient },
                { label: "Trạng thái", value: labels[selected.status] ?? selected.status },
                { label: "Số lần thử", value: selected.attempts },
              ]}
            />
            {selected.lastError && (
              <section className="at-catalog-detail-section">
                <h3>Chi tiết lỗi</h3>
                <div className="at-catalog-description">{selected.lastError}</div>
              </section>
            )}
            {error && <Notice tone="error">{error}</Notice>}
          </div>
        )}
      </Dialog>
    </>
  );
}
