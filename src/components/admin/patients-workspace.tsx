"use client";
import { PatientAllergies } from "./patient-allergies";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { api, queryString } from "@/lib/api";
import type { Patient, PageResult } from "@/lib/types";
import {
  Button,
  Field,
  Notice,
  Pager,
  SearchInput,
  SelectInput,
  TextArea,
  TextInput,
  ButtonLink,
  Form,
} from "@/components/ui/primitives";
import { DataTable, DetailList, FilterBar, PageHeader } from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import { QueryState } from "@/components/workspace-ui";
const empty = {
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  allergies: "",
  medicalHistory: "",
};
const values = (p: Patient) => ({
  fullName: p.fullName,
  phone: p.phone ?? "",
  email: p.email ?? "",
  dateOfBirth: p.dateOfBirth ?? "",
  gender: p.gender ?? "",
  address: p.address ?? "",
  allergies: p.allergies ?? "",
  medicalHistory: p.medicalHistory ?? "",
});
const genders: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };
export function PatientsWorkspace() {
  const cache = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<{
    mode: "view" | "edit" | "create";
    row: Patient | null;
  } | null>(null);
  const [form, setForm] = useState(empty);
  const [initial, setInitial] = useState(empty);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const patients = useQuery({
    queryKey: ["patients", q, page],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Patient>>(`/api/v1/patients/search${queryString({ q, page, size: 20 })}`, {
        signal,
      }),
  });
  function open(row: Patient | null, mode: "view" | "edit" | "create") {
    const next = row ? values(row) : empty;
    setEditor({ row, mode });
    setForm(next);
    setInitial(next);
    setError("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = editor?.row?.id;
      const patient = await api<Patient>(`/api/v1/patients${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({ ...form, dateOfBirth: form.dateOfBirth || null }),
      });
      setMessage(`Đã lưu ${patient.code} · ${patient.fullName}.`);
      setEditor(null);
      await cache.invalidateQueries({ queryKey: ["patients"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được hồ sơ.");
    } finally {
      setBusy(false);
    }
  }
  const columns: ColumnDef<Patient>[] = [
    {
      id: "code",
      header: "Mã bệnh nhân",
      size: 150,
      cell: ({ row }) => <span className="at-cell-code">{row.original.code}</span>,
    },
    {
      id: "name",
      header: "Họ tên",
      size: 220,
      cell: ({ row }) => (
        <Button
          appearance="custom"
          type="button"
          className="at-cell-name"
          aria-label={row.original.fullName}
          onClick={() => open(row.original, "view")}
        >
          {row.original.fullName}
          <small className="at-patient-mobile-code">{row.original.code}</small>
        </Button>
      ),
    },
    { id: "phone", header: "Điện thoại", size: 160, cell: ({ row }) => row.original.phone || "—" },
    {
      id: "birth",
      header: "Ngày sinh",
      size: 140,
      cell: ({ row }) => row.original.dateOfBirth?.split("-").reverse().join("/") || "—",
    },
    {
      id: "gender",
      header: "Giới tính",
      size: 100,
      cell: ({ row }) => genders[row.original.gender ?? ""] ?? row.original.gender ?? "—",
    },
    {
      id: "actions",
      header: "Thao tác",
      size: 180,
      cell: ({ row }) => (
        <div className="at-catalog-row-actions">
          <Button variant="ghost" type="button" onClick={() => open(row.original, "edit")}>
            Sửa
          </Button>
          <ButtonLink variant="ghost" href={`/booking?patientId=${row.original.id}`}>
            Đặt lịch hộ
          </ButtonLink>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Vận hành"
        title="Hồ sơ bệnh nhân"
        description="Tạo hồ sơ khách vãng lai rồi đặt lịch hộ. Hồ sơ không tự gộp với tài khoản có cùng tên hoặc số điện thoại."
        actions={
          <Button type="button" onClick={() => open(null, "create")}>
            Thêm hồ sơ
          </Button>
        }
      />
      {message && <Notice>{message}</Notice>}
      <FilterBar
        onClear={() => {
          setQ("");
          setPage(0);
        }}
      >
        <SearchInput
          placeholder="Tên, số điện thoại hoặc mã bệnh nhân"
          aria-label="Tìm bệnh nhân"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </FilterBar>
      <QueryState
        loading={patients.isLoading}
        error={patients.error}
        retry={() => void patients.refetch()}
      />
      {patients.data && (
        <>
          <DataTable
            fitColumns
            className="at-catalog-table at-patients-table"
            data={patients.data.content}
            columns={columns}
          />
          <Pager
            page={page}
            totalPages={patients.data.totalPages}
            totalElements={patients.data.totalElements}
            onPage={setPage}
          />
        </>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        size="wide"
        title={
          editor?.mode === "view"
            ? "Chi tiết hồ sơ"
            : editor?.mode === "edit"
              ? "Sửa hồ sơ"
              : "Thêm hồ sơ bệnh nhân"
        }
        description={editor?.row?.code}
        busy={busy}
        dirty={editor?.mode !== "view" && JSON.stringify(form) !== JSON.stringify(initial)}
        footer={
          <>
            <DialogClose>
              <Button variant="ghost" type="button" disabled={busy}>
                {editor?.mode === "view" ? "Đóng" : "Hủy"}
              </Button>
            </DialogClose>
            {editor?.mode === "view" ? (
              <Button
                key="edit"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  open(editor.row, "edit");
                }}
              >
                Sửa hồ sơ
              </Button>
            ) : (
              <Button key="save" type="submit" form="patient-form" busy={busy}>
                Lưu hồ sơ
              </Button>
            )}
          </>
        }
      >
        {editor?.mode === "view" && editor.row ? (
          <div className="at-catalog-details">
            <PatientAllergies key={editor.row.id} patientId={editor.row.id} />
            <h3 className="font-semibold text-xl">{editor.row.fullName}</h3>
            <DetailList
              items={[
                { label: "Điện thoại", value: editor.row.phone },
                { label: "Email", value: editor.row.email },
                {
                  label: "Ngày sinh",
                  value: editor.row.dateOfBirth?.split("-").reverse().join("/"),
                },
                {
                  label: "Giới tính",
                  value: genders[editor.row.gender ?? ""] ?? editor.row.gender,
                },
                { label: "Địa chỉ", value: editor.row.address },
              ]}
            />
            {[
              ["Dị ứng", editor.row.allergies],
              ["Tiền sử", editor.row.medicalHistory],
            ].map(([title, content]) => (
              <section className="at-catalog-detail-section" key={title}>
                <h3>{title}</h3>
                <div className="at-catalog-description">{content || "Chưa cung cấp"}</div>
              </section>
            ))}
          </div>
        ) : (
          <Form id="patient-form" onSubmit={save} className="space-y-5">
            {error && <Notice tone="error">{error}</Notice>}
            <section className="at-catalog-form-section">
              <h3 className="at-section-title">Thông tin cá nhân và liên hệ</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["fullName", "Họ tên"],
                    ["phone", "Điện thoại"],
                    ["email", "Email"],
                    ["dateOfBirth", "Ngày sinh"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label} required={key === "fullName"}>
                    <TextInput
                      required={key === "fullName"}
                      type={
                        key === "dateOfBirth"
                          ? "date"
                          : key === "email"
                            ? "email"
                            : key === "phone"
                              ? "tel"
                              : "text"
                      }
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </Field>
                ))}
                <Field label="Giới tính">
                  <SelectInput
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">Chưa cung cấp</option>
                    {form.gender && !genders[form.gender] && (
                      <option value={form.gender}>{form.gender}</option>
                    )}
                    {Object.entries(genders).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Địa chỉ">
                  <TextInput
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
              </div>
            </section>
            <section className="at-catalog-form-section">
              <h3 className="at-section-title">Thông tin sức khỏe</h3>
              <div className="grid gap-4">
                {(
                  [
                    ["allergies", "Dị ứng"],
                    ["medicalHistory", "Tiền sử"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <TextArea
                      rows={4}
                      maxLength={5000}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
            </section>
          </Form>
        )}
      </Dialog>
    </>
  );
}
