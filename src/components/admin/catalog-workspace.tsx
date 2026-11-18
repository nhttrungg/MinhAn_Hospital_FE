"use client";
import { useState, type ComponentType, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, KeyRound, Wallet, Power } from "lucide-react";
import { CatalogDetails, catalogColumns, entityNames } from "./catalog-presentation";
import {
  Button,
  Field,
  TextInput,
  PasswordField,
  SearchInput,
  Pager,
  Notice,
  Form,
} from "@/components/ui/primitives";
import { PageHeader, FilterBar, DataTable, EmptyState } from "@/components/ui/data-display";
import { ConfirmDialog, Dialog, DialogClose, RowMenu, MenuItem } from "@/components/ui/overlays";
import { QueryState } from "@/components/workspace-ui";
import { api, allOptions, ApiError } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import { catalogNames, type CatalogKind, type CatalogRow } from "@/lib/catalog-types";
import { useCatalog } from "@/hooks/use-catalog";
import {
  CatalogDirtyContext,
  CatalogModalContext,
  type EntityFormProps,
} from "./catalog-form-parts";
import { ActiveSegmented, PasswordStrength } from "./admin-parts";
import { DepartmentForm } from "./department-form";
import { RoomForm } from "./room-form";
import { SpecialtyForm } from "./specialty-form";
import { MedicationForm } from "./medication-form";
import { ServiceForm } from "./service-form";
import { StaffForm } from "./staff-form";
import { ClinicalTemplates } from "./clinical-productivity-parts";
const forms: Record<CatalogKind, ComponentType<EntityFormProps>> = {
  departments: DepartmentForm,
  rooms: RoomForm,
  specialties: SpecialtyForm,
  medications: MedicationForm,
  services: ServiceForm,
  accounts: StaffForm,
};
export function CatalogWorkspace({ kind }: { kind: CatalogKind }) {
  const c = useCatalog(kind);
  const [editor, setEditor] = useState<{
    mode: "view" | "edit" | "create";
    row: CatalogRow | null;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<CatalogRow | null>(null);
  const [reset, setReset] = useState<CatalogRow | null>(null);
  const [price, setPrice] = useState<CatalogRow | null>(null);
  const [blockers, setBlockers] = useState<ApiError | null>(null);
  const Form = forms[kind];
  function edit(row: CatalogRow | null, mode: "view" | "edit" | "create") {
    setEditor({ row, mode });
    setDirty(false);
  }
  const departments = useQuery({
    queryKey: ["departments", "options"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/departments", { signal }),
    enabled: kind === "specialties",
  });
  const hasFilter = !!c.q || !!c.active;
  function clearFilters() {
    c.setQ("");
    c.setActive("");
    c.setPage(0);
  }
  const columns = catalogColumns({
    kind,
    departments: departments.data ?? [],
    onView: (row) => edit(row, "view"),
    actions: (row) => (
      <div className="at-row-actions" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Sửa ${row.name ?? row.fullName}`}
          onClick={() => edit(row, "edit")}
        >
          <Pencil size={14} />
          <span>Sửa</span>
        </Button>
        <RowMenu label={`Thao tác ${row.name ?? row.fullName}`}>
          <MenuItem onSelect={() => edit(row, "view")}>Xem chi tiết</MenuItem>
          {kind === "services" && row.active && (
            <MenuItem onSelect={() => setPrice(row)}>
              <Wallet size={16} />
              Cập nhật giá
            </MenuItem>
          )}
          {kind === "accounts" && (
            <MenuItem onSelect={() => setReset(row)}>
              <KeyRound size={16} />
              Đặt lại mật khẩu
            </MenuItem>
          )}
          <MenuItem
            danger={row.active}
            onSelect={() => {
              setStatus(row);
              setBlockers(null);
            }}
          >
            <Power size={16} />
            {row.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
          </MenuItem>
        </RowMenu>
      </div>
    ),
  });
  return (
    <>
      <PageHeader
        eyebrow="Nhân sự và danh mục"
        title={catalogNames[kind]}
        description={
          kind === "accounts"
            ? "Quản lý thông tin nhân viên, quyền truy cập và hồ sơ bác sĩ."
            : "Quản lý danh mục đang sử dụng và thông tin liên quan."
        }
        actions={
          <Button onClick={() => edit(null, "create")}>
            <Plus size={17} />
            Thêm mới
          </Button>
        }
      />
      <FilterBar
        label={`Bộ lọc ${entityNames[kind]}`}
        onClear={hasFilter ? clearFilters : undefined}
      >
        <SearchInput
          aria-label="Tìm kiếm danh mục"
          placeholder="Tìm tên hoặc mã"
          value={c.q}
          onChange={(e) => {
            c.setQ(e.target.value);
            c.setPage(0);
          }}
        />
        <ActiveSegmented
          value={c.active}
          onChange={(value) => {
            c.setActive(value);
            c.setPage(0);
          }}
        />
      </FilterBar>
      {kind === "specialties" && <ClinicalTemplates shared />}
      {kind === "specialties" && (
        <QueryState
          loading={departments.isLoading}
          error={departments.error}
          retry={() => void departments.refetch()}
        />
      )}
      <QueryState
        loading={c.query.isLoading}
        error={c.query.error}
        retry={() => void c.query.refetch()}
      />
      {c.query.data && (
        <>
          <DataTable
            fitColumns
            className={`at-adm-table at-labels-catalog at-kind-${kind}`}
            caption={`Danh sách ${entityNames[kind]}`}
            rowLabel={(row) => `Xem chi tiết ${entityNames[kind]} ${row.name ?? row.fullName}`}
            busy={c.query.isFetching && !c.query.isLoading}
            data={c.query.data.content}
            columns={columns}
            onRow={(row) => edit(row, "view")}
            selected={editor?.row?.id}
            empty={
              <EmptyState
                title={hasFilter ? "Không có kết quả phù hợp" : `Chưa có ${entityNames[kind]} nào`}
                description={
                  hasFilter
                    ? "Thử đổi từ khóa hoặc bỏ lọc trạng thái để xem thêm."
                    : `Thêm ${entityNames[kind]} đầu tiên để bắt đầu sử dụng danh mục này.`
                }
                action={
                  hasFilter ? (
                    <Button variant="ghost" onClick={clearFilters}>
                      Bỏ bộ lọc hiện tại
                    </Button>
                  ) : (
                    <Button onClick={() => edit(null, "create")}>
                      <Plus size={17} />
                      Thêm {entityNames[kind]} đầu tiên
                    </Button>
                  )
                }
              />
            }
          />
          <Pager
            page={c.page}
            size={c.size}
            onSize={(v) => {
              c.setSize(v);
              c.setPage(0);
            }}
            totalPages={c.query.data.totalPages}
            totalElements={c.query.data.totalElements}
            onPage={c.setPage}
          />
        </>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(value) => {
          if (!value) setEditor(null);
        }}
        size="wide"
        title={`${editor?.mode === "view" ? "Chi tiết" : editor?.mode === "edit" ? "Sửa" : "Thêm"} ${entityNames[kind]}`}
        description={
          editor?.mode === "create"
            ? "Nhập các thông tin cần thiết để tạo mới."
            : editor?.mode === "edit"
              ? (editor.row?.code ?? editor.row?.employeeCode)
              : undefined
        }
        dirty={dirty}
        busy={c.busy}
        footer={
          <>
            <DialogClose>
              <Button type="button" variant="ghost" disabled={c.busy}>
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
                  edit(editor.row, "edit");
                }}
              >
                <Pencil size={16} />
                Sửa thông tin
              </Button>
            ) : (
              <Button key="save-record" type="submit" form="catalog-entity-form" busy={c.busy}>
                {editor?.mode === "edit" ? "Lưu thay đổi" : "Tạo mới"}
              </Button>
            )}
          </>
        }
      >
        {editor &&
          (editor.mode === "view" && editor.row ? (
            <CatalogDetails row={editor.row} kind={kind} departments={departments.data ?? []} />
          ) : (
            <CatalogDirtyContext.Provider value={setDirty}>
              <CatalogModalContext.Provider value>
                <Form
                  key={`${editor.row?.id ?? 0}-${kind}-${editor.mode}`}
                  row={editor.row}
                  busy={c.busy}
                  onSave={async (values) => {
                    await c.save(editor.row, values);
                    setDirty(false);
                    setEditor(null);
                  }}
                />
              </CatalogModalContext.Provider>
            </CatalogDirtyContext.Provider>
          ))}
      </Dialog>
      <ConfirmDialog
        key={status?.id ?? 0}
        open={!!status}
        onOpenChange={(v) => {
          if (!v) setStatus(null);
        }}
        title={status?.active ? "Ngưng hoạt động?" : "Kích hoạt danh mục?"}
        description={
          status?.active
            ? "Kiểm tra các lịch và lượt khám đang sử dụng trước khi ngưng. Dữ liệu lịch sử vẫn được giữ."
            : "Danh mục sẽ được sử dụng trở lại sau khi lưu."
        }
        actionLabel={status?.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
        danger={status?.active}
        onConfirm={async () => {
          if (!status) return;
          try {
            await c.changeStatus(status);
          } catch (e) {
            if (e instanceof ApiError) setBlockers(e);
            throw e;
          }
        }}
      >
        <div className="at-adm-confirm-target">
          <p className="font-semibold">{status?.name ?? status?.fullName}</p>
          <small>{status?.code ?? status?.employeeCode}</small>
        </div>
        {blockers?.problem.blockers && (
          <Notice tone="warning">
            <p className="font-semibold">
              {blockers.problem.totalBlockers} lịch/lượt cần xử lý trước khi ngưng
            </p>
            <ul className="at-adm-blockers">
              {blockers.problem.blockers.map((b) => (
                <li key={b.id}>
                  {b.code} · {b.status}
                </li>
              ))}
            </ul>
          </Notice>
        )}
      </ConfirmDialog>
      <CatalogActionDialog
        kind="password"
        row={reset}
        onClose={() => setReset(null)}
        onSave={async (value) => {
          await api(`/api/v1/staff-accounts/${reset?.id}/reset-password`, {
            method: "POST",
            body: JSON.stringify({ newPassword: value }),
          });
          c.toast("Đã đặt lại mật khẩu. Các phiên cũ đã hết hiệu lực.");
        }}
      />
      <CatalogActionDialog
        kind="price"
        row={price}
        onClose={() => setPrice(null)}
        onSave={async (value) => {
          await api(`${c.endpoint}/${price?.id}/price`, {
            method: "PUT",
            body: JSON.stringify({ unitPrice: value }),
          });
          await Promise.all([
            c.cache.invalidateQueries({ queryKey: ["catalog", kind] }),
            ...[
              "doctors",
              "public-doctors",
              "slots",
              "managed-slots",
              "public-doctor-availability",
            ].map((key) => c.cache.invalidateQueries({ queryKey: [key] })),
          ]);
          c.toast("Đã cập nhật giá dịch vụ.");
        }}
      />
    </>
  );
}
function CatalogActionDialog({
  kind,
  row,
  onClose,
  onSave,
}: {
  kind: "price" | "password";
  row: CatalogRow | null;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  return row ? (
    <ActionForm key={row.id} kind={kind} row={row} onClose={onClose} onSave={onSave} />
  ) : null;
}
function ActionForm({
  kind,
  row,
  onClose,
  onSave,
}: {
  kind: "price" | "password";
  row: CatalogRow;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(kind === "price" ? (row.unitPrice ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(value);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={kind === "price" ? "Cập nhật giá dịch vụ" : "Đặt lại mật khẩu nhân viên"}
      description={row.name ?? row.fullName}
      dirty={value !== "" && value !== (row.unitPrice ?? "")}
      busy={busy}
    >
      <Form className="space-y-5" onSubmit={submit}>
        {kind === "price" ? (
          <>
            <Notice>
              Giá hiện tại: {formatVnd(row.unitPrice ?? null)}. Các lịch đã đặt giữ nguyên giá đã
              ghi nhận.
            </Notice>
            <Field label="Giá mới (VND)" required hint="Nhập số tiền, tối đa 2 chữ số thập phân.">
              <TextInput
                required
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <>
            <Notice tone="warning">
              Phiên đăng nhập hiện tại của nhân viên sẽ hết hiệu lực sau khi đặt lại mật khẩu.
            </Notice>
            <div className="space-y-2">
              <Field label="Mật khẩu mới" required>
                <PasswordField
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
              <PasswordStrength value={value} />
            </div>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="at-form-actions">
          <DialogClose>
            <Button type="button" variant="ghost" disabled={busy}>
              Hủy
            </Button>
          </DialogClose>
          <Button busy={busy} type="submit">
            {kind === "price" ? "Cập nhật giá" : "Đặt lại mật khẩu"}
          </Button>
        </div>
      </Form>
    </Dialog>
  );
}
