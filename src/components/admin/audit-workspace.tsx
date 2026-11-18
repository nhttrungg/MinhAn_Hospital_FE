"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { api, queryString } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { PageResult } from "@/lib/types";
import { Button, Pager, SearchInput } from "@/components/ui/primitives";
import {
  CompactText,
  DataTable,
  DetailList,
  FilterBar,
  PageHeader,
} from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import { QueryState } from "@/components/workspace-ui";
const actions: Record<string, string> = {
  LOGIN_SUCCESS: "Đăng nhập",
  LOGIN_FAILED: "Đăng nhập thất bại",
  LOGOUT: "Đăng xuất",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  HIDE: "Ẩn đánh giá",
  SHOW: "Công khai đánh giá",
  CHANGE_PASSWORD: "Đổi mật khẩu",
  RESET_PASSWORD: "Đặt lại mật khẩu",
};
type Audit = {
  id: number;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  requestId: string | null;
  createdAt: string;
};
export function AuditWorkspace() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Audit | null>(null);
  const list = useQuery({
    queryKey: ["audit", q, page],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Audit>>(`/api/v1/audit-logs${queryString({ q, page, size: 20 })}`, { signal }),
  });
  const columns: ColumnDef<Audit>[] = [
    {
      id: "time",
      header: "Thời gian",
      size: 180,
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: "actor",
      header: "Người thao tác",
      size: 180,
      cell: ({ row }) => row.original.actorName ?? "Khách / hệ thống",
    },
    {
      id: "action",
      header: "Hành động / đối tượng",
      size: 210,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            type="button"
            className="at-cell-name"
            onClick={() => setSelected(row.original)}
          >
            <CompactText
              text={actions[row.original.action] ?? row.original.action.replaceAll("_", " ")}
            />
          </Button>
          <small>
            {row.original.entityType} #{row.original.entityId ?? "—"}
          </small>
        </>
      ),
    },
    {
      id: "summary",
      header: "Nội dung ngắn",
      size: 290,
      cell: ({ row }) => <CompactText text={row.original.detail} />,
    },
    {
      id: "actions",
      header: "Chi tiết",
      size: 105,
      cell: ({ row }) => (
        <Button variant="ghost" type="button" onClick={() => setSelected(row.original)}>
          Xem
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Hệ thống"
        title="Nhật ký thao tác"
        description="Theo dõi người thao tác và các thay đổi trong hệ thống."
      />
      <FilterBar
        onClear={() => {
          setQ("");
          setPage(0);
        }}
      >
        <SearchInput
          aria-label="Tìm nhật ký"
          placeholder="Tìm người thao tác, đối tượng hoặc hành động"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </FilterBar>
      <QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()} />
      {list.data && (
        <>
          <DataTable
            fitColumns
            className="at-catalog-table"
            data={list.data.content}
            columns={columns}
            onRow={setSelected}
          />
          <Pager
            page={page}
            totalPages={list.data.totalPages}
            totalElements={list.data.totalElements}
            onPage={setPage}
          />
        </>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        size="wide"
        title="Chi tiết nhật ký"
        description={selected?.action}
        footer={
          <DialogClose>
            <Button variant="ghost" type="button">
              Đóng
            </Button>
          </DialogClose>
        }
      >
        {selected && (
          <div className="at-catalog-details">
            <DetailList
              items={[
                { label: "Thời gian", value: formatDateTime(selected.createdAt) },
                { label: "Người thao tác", value: selected.actorName ?? "Khách / hệ thống" },
                {
                  label: "Đối tượng",
                  value: `${selected.entityType} #${selected.entityId ?? "—"}`,
                },
                { label: "Mã yêu cầu", value: selected.requestId },
              ]}
            />
            <section className="at-catalog-detail-section">
              <h3>Nội dung đầy đủ</h3>
              <div className="at-catalog-description">
                {selected.detail || "Không có nội dung bổ sung."}
              </div>
            </section>
          </div>
        )}
      </Dialog>
    </>
  );
}
