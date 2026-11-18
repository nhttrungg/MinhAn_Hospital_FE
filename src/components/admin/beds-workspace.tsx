"use client";
import { invalidateDataGroups } from "@/lib/query-cache";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Power } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Badge,
  Button,
  Field,
  Notice,
  Pager,
  SelectInput,
  TextInput,
  SearchInput,
  Checkbox,
  Form,
  StatusBadge,
} from "@/components/ui/primitives";
import { PageHeader, FilterBar, DataTable, EmptyState } from "@/components/ui/data-display";
import { ActiveSegmented } from "./admin-parts";
import { Dialog, DialogClose, ConfirmDialog, RowMenu, MenuItem } from "@/components/ui/overlays";
import { ApiError, allOptions, api, queryString } from "@/lib/api";
import { bedStatusLabels, labelOf } from "@/lib/labels";
import type { Bed, PageResult, Room } from "@/lib/types";
import { QueryState } from "@/components/workspace-ui";

const schema = z.object({
  roomId: z.string().min(1, "Chọn buồng bệnh"),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{1,30}$/, "Mã giường không hợp lệ"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;
const defaults: FormValues = { roomId: "", code: "", status: "AVAILABLE", active: true };

export function BedsWorkspace() {
  const cache = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [bedStatus, setBedStatus] = useState("");
  const [active, setActive] = useState("");
  const [editor, setEditor] = useState<{
    mode: "view" | "edit" | "create";
    row: Bed | null;
  } | null>(null);
  const [statusRow, setStatusRow] = useState<Bed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const rooms = useQuery({
    queryKey: ["rooms", "wards"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Room>("/api/v1/catalog/rooms?roomType=WARD&active=true&sort=code,asc", { signal }),
    enabled: editor?.mode === "create",
  });
  const list = useQuery({
    queryKey: ["beds", q, page, size, bedStatus, active],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Bed>>(
        `/api/v1/catalog/beds${queryString({
          q,
          page,
          size,
          sort: "code,asc",
          status: bedStatus || null,
          active: active || null,
        })}`,
        { signal },
      ),
  });
  const hasFilter = !!q || !!bedStatus || !!active;
  function clearFilters() {
    setQ("");
    setBedStatus("");
    setActive("");
    setPage(0);
  }
  function open(row: Bed | null, mode: "view" | "edit" | "create") {
    form.reset(
      row
        ? {
            roomId: String(row.roomId),
            code: row.code,
            status: row.status as FormValues["status"],
            active: row.active,
          }
        : defaults,
    );
    setError("");
    setEditor({ row, mode });
  }
  async function save(values: FormValues) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/catalog/beds${editor?.row ? `/${editor.row.id}` : ""}`, {
        method: editor?.row ? "PUT" : "POST",
        body: JSON.stringify(
          editor?.row
            ? { status: values.status, active: values.active }
            : { roomId: Number(values.roomId), code: values.code, status: values.status },
        ),
      });
      setEditor(null);
      form.reset(defaults);
      await invalidateDataGroups(cache, ["beds", "rooms", "dashboard-summary"]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không lưu được giường.");
    } finally {
      setBusy(false);
    }
  }
  const columns: ColumnDef<Bed>[] = [
    {
      id: "identity",
      header: "Giường",
      size: 150,
      cell: ({ row }) => (
        <>
          <Button
            appearance="custom"
            type="button"
            className="at-cell-name"
            onClick={() => open(row.original, "view")}
          >
            {row.original.code}
          </Button>
          <small className="at-cell-code">Buồng {row.original.roomCode}</small>
        </>
      ),
    },
    {
      id: "room",
      header: "Buồng bệnh",
      size: 220,
      cell: ({ row }) => row.original.roomName,
    },
    { id: "department", header: "Khoa", size: 200, cell: ({ row }) => row.original.departmentName },
    {
      id: "status",
      header: "Tình trạng",
      size: 140,
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          tone={row.original.status === "OCCUPIED" ? "info" : undefined}
        >
          {labelOf(bedStatusLabels, row.original.status)}
        </StatusBadge>
      ),
    },
    {
      id: "active",
      header: "Trạng thái",
      size: 160,
      cell: ({ row }) => <Badge active={row.original.active} />,
    },
    {
      id: "actions",
      header: "Thao tác",
      size: 130,
      cell: ({ row }) => (
        <div className="at-row-actions" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Sửa giường ${row.original.code}`}
            onClick={() => open(row.original, "edit")}
          >
            <Pencil size={14} />
            Sửa
          </Button>
          <RowMenu label={`Thao tác giường ${row.original.code}`}>
            <MenuItem onSelect={() => open(row.original, "view")}>Xem chi tiết</MenuItem>
            <MenuItem danger={row.original.active} onSelect={() => setStatusRow(row.original)}>
              <Power size={16} />
              {row.original.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
            </MenuItem>
          </RowMenu>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Nhân sự và danh mục"
        title="Danh mục giường"
        description="Danh mục giường theo buồng. Trạng thái do quản trị đánh dấu tay. Phòng khám chưa có nhập viện, chuyển giường hay ra viện."
        actions={
          <Button type="button" onClick={() => open(null, "create")}>
            <Plus size={17} />
            Thêm mới
          </Button>
        }
      />
      <FilterBar label="Bộ lọc giường" onClear={hasFilter ? clearFilters : undefined}>
        <SearchInput
          aria-label="Tìm giường"
          placeholder="Tìm mã giường hoặc buồng bệnh"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(0);
          }}
        />
        <Field label="Tình trạng giường">
          <SelectInput
            value={bedStatus}
            onChange={(event) => {
              setBedStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả tình trạng</option>
            {Object.entries(bedStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <ActiveSegmented
          value={active}
          onChange={(value) => {
            setActive(value);
            setPage(0);
          }}
        />
      </FilterBar>
      <QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()} />
      {list.data && (
        <>
          <DataTable
            fitColumns
            className="at-adm-table at-labels-beds"
            caption="Danh sách giường"
            rowLabel={(row) => `Xem chi tiết giường ${row.code}`}
            busy={list.isFetching && !list.isLoading}
            data={list.data.content}
            columns={columns}
            onRow={(row) => open(row, "view")}
            selected={editor?.row?.id}
            empty={
              <EmptyState
                title={hasFilter ? "Không có giường phù hợp" : "Chưa có giường nào"}
                description={
                  hasFilter
                    ? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
                    : "Thêm giường vào buồng bệnh để quản lý tình trạng sử dụng."
                }
                action={
                  hasFilter ? (
                    <Button variant="ghost" onClick={clearFilters}>
                      Bỏ bộ lọc hiện tại
                    </Button>
                  ) : (
                    <Button onClick={() => open(null, "create")}>
                      <Plus size={17} />
                      Thêm giường đầu tiên
                    </Button>
                  )
                }
              />
            }
          />
          <Pager
            page={page}
            size={size}
            onSize={(value) => {
              setSize(value);
              setPage(0);
            }}
            totalPages={list.data.totalPages}
            totalElements={list.data.totalElements}
            onPage={setPage}
          />
        </>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(value) => {
          if (!value) setEditor(null);
        }}
        size="wide"
        title={
          editor?.mode === "view"
            ? "Chi tiết giường"
            : editor?.mode === "edit"
              ? "Sửa giường"
              : "Thêm giường"
        }
        description={editor?.row?.code ?? "Chọn buồng bệnh và nhập thông tin giường."}
        dirty={editor?.mode !== "view" && form.formState.isDirty}
        busy={busy}
        footer={
          <>
            <DialogClose>
              <Button type="button" variant="ghost" disabled={busy}>
                {editor?.mode === "view" ? "Đóng" : "Hủy"}
              </Button>
            </DialogClose>
            {editor?.mode === "view" ? (
              <Button
                key="open-edit"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  open(editor.row, "edit");
                }}
              >
                <Pencil size={16} />
                Sửa thông tin
              </Button>
            ) : (
              <Button key="save-bed" type="submit" form="bed-entity-form" busy={busy}>
                {editor?.mode === "edit" ? "Lưu thay đổi" : "Tạo mới"}
              </Button>
            )}
          </>
        }
      >
        {editor?.mode === "view" && editor.row ? (
          <div className="at-catalog-details">
            <div className="at-catalog-detail-hero">
              <div>
                <p className="at-cell-code">{editor.row.roomCode}</p>
                <h3>Giường {editor.row.code}</h3>
              </div>
              <Badge active={editor.row.active} />
            </div>
            <section className="at-catalog-detail-section">
              <h3>Vị trí và tình trạng</h3>
              <dl className="at-catalog-detail-grid">
                {[
                  ["Buồng bệnh", editor.row.roomName],
                  ["Khoa", editor.row.departmentName],
                  ["Tình trạng", labelOf(bedStatusLabels, editor.row.status)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        ) : (
          <Form id="bed-entity-form" className="space-y-5" onSubmit={form.handleSubmit(save)}>
            {error && <Notice tone="error">{error}</Notice>}
            <section className="at-catalog-form-section">
              <h3 className="at-section-title">Vị trí giường</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {editor?.mode === "create" ? (
                  <div className="sm:col-span-2">
                    <QueryState
                      loading={rooms.isLoading}
                      error={rooms.error}
                      retry={() => void rooms.refetch()}
                    />
                    <Field
                      label="Buồng bệnh"
                      required
                      error={form.formState.errors.roomId?.message}
                    >
                      <SelectInput
                        {...form.register("roomId")}
                        disabled={rooms.isLoading || !!rooms.error}
                      >
                        <option value="">Chọn buồng bệnh</option>
                        {rooms.data?.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.departmentName} / {room.name} ({room.code})
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                ) : (
                  <Field label="Buồng bệnh">
                    <TextInput value={editor?.row?.roomName ?? ""} readOnly />
                  </Field>
                )}
                <Field label="Mã giường" required error={form.formState.errors.code?.message}>
                  <TextInput {...form.register("code")} readOnly={editor?.mode === "edit"} />
                </Field>
              </div>
            </section>
            <section className="at-catalog-form-section">
              <h3 className="at-section-title">Tình trạng sử dụng</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tình trạng" required error={form.formState.errors.status?.message}>
                  <SelectInput {...form.register("status")}>
                    {Object.entries(bedStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                {editor?.mode === "edit" && (
                  <div className="self-end">
                    <Checkbox label="Đang hoạt động" {...form.register("active")} />
                  </div>
                )}
              </div>
              <p className="at-field-hint mt-3">
                Giường đang có người nằm không được ngưng hoạt động.
              </p>
            </section>
          </Form>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!statusRow}
        onOpenChange={(value) => {
          if (!value) setStatusRow(null);
        }}
        title={statusRow?.active ? "Ngưng hoạt động giường?" : "Kích hoạt lại giường?"}
        description={statusRow ? `Giường ${statusRow.code} · ${statusRow.roomName}` : ""}
        actionLabel={statusRow?.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
        danger={statusRow?.active}
        onConfirm={async () => {
          if (!statusRow) return;
          try {
            await api(`/api/v1/catalog/beds/${statusRow.id}`, {
              method: "PUT",
              body: JSON.stringify({ status: statusRow.status, active: !statusRow.active }),
            });
            await invalidateDataGroups(cache, ["beds", "rooms", "dashboard-summary"]);
          } catch (error) {
            throw error instanceof ApiError ? error : new Error("Không cập nhật được giường.");
          }
        }}
      />
    </>
  );
}
