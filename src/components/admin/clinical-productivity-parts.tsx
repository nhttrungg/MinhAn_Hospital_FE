"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
const ClinicalHistoryChart = dynamic(
  () => import("./clinical-history-chart").then((m) => m.ClinicalHistoryChart),
  { loading: () => <p>Đang tải biểu đồ…</p> },
);
import { api, allOptions, queryString } from "@/lib/api";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { vietnamDate, type PrescriptionLine } from "@/lib/outpatient";
import {
  applyTemplate,
  measurementGroup,
  templateFields,
  type ClinicalTemplate,
  type TemplateApplication,
  type PatientSummary,
  type DiagnosticHistory,
  type Availability,
} from "@/lib/clinical-productivity";
import type { ClinicalEncounter } from "@/lib/clinical-safety";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Disclosure,
  Button,
  Card,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  Checkbox,
  Notice,
  Form,
} from "@/components/ui";
import { Dialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";

export function PatientSummaryPanel({ encounterId }: { encounterId: number }) {
  const me = useUser();
  const q = useQuery({
    queryKey: ["patient-summary", encounterId, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PatientSummary>(`/api/v1/encounters/${encounterId}/patient-summary`, { signal }),
  });
  return (
    <Card className="no-print space-y-3">
      <h2 className="font-semibold">
        Thông tin trước khám {q.data?.age != null ? `· ${q.data.age} tuổi` : ""}
      </h2>
      <QueryState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />
      {q.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["medicalHistory", "Tiền sử đã khai"],
                ["allergies", "Dị ứng đã khai"],
                ["vitals", "Sinh hiệu gần nhất"],
                ["lastCompletedVisit", "Lần khám hoàn tất gần nhất"],
                ["diagnosis", "Chẩn đoán gần nhất"],
              ] as const
            ).map(([key, label]) => {
              const source = q.data![key];
              return (
                <div key={key}>
                  <strong>{label}</strong>
                  <p className="whitespace-pre-wrap">
                    {source.content ||
                      (key === "allergies" && q.data!.allergyDetails?.length
                        ? "Dị ứng hoạt chất đã ghi nhận bên dưới"
                        : "Chưa có thông tin")}
                  </p>
                  {source.content && source.href && (
                    <Link className="text-primary underline text-sm" href={source.href}>
                      Hồ sơ nguồn · {formatDateTime(source.recordedAt)}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          {q.data.allergyDetails?.map((source, i) => (
            <p key={i}>
              {source.content} ·{" "}
              <Link className="underline" href={source.href!}>
                {source.recordedAt ? formatDateTime(source.recordedAt) : "Chưa có mốc ghi nhận"}
              </Link>
            </p>
          ))}
          <Disclosure title={<>Thuốc đã kê gần đây ({q.data.prescribedMedications.length})</>}>
            <p className="text-sm text-muted">Đây là thuốc đã kê trong các lần khám trước.</p>
            {q.data.prescribedMedications.length === 0 && <p>Chưa có thông tin</p>}
            {q.data.prescribedMedications.map((m, i) => (
              <p key={i}>
                {m.name} {m.strength} · {m.dose} · {m.frequency} · {m.quantity}{" "}
                <Link className="underline" href={m.href}>
                  {formatDateTime(m.prescribedAt)}
                </Link>
              </p>
            ))}
          </Disclosure>
        </>
      )}
    </Card>
  );
}

export function ClinicalTemplates({
  shared = false,
  specialtyId,
  form,
  onApply,
}: {
  shared?: boolean;
  specialtyId?: number | null;
  form?: ClinicalEncounter;
  onApply?: (next: ClinicalEncounter, applied: TemplateApplication) => void;
}) {
  const cache = useQueryClient();
  const [selected, setSelected] = useState<ClinicalTemplate | null>(null);
  const [overwrite, setOverwrite] = useState<string[]>([]);
  const [edit, setEdit] = useState<Partial<ClinicalTemplate> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const me = useUser();
  const q = useQuery({
    queryKey: ["clinical-templates", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<ClinicalTemplate[]>("/api/v1/clinical-templates", { signal }),
  });
  const specialties = useQuery({
    queryKey: ["template-specialties"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<{ id: number; name: string }>("/api/v1/catalog/specialties?active=true", {
        signal,
      }),
  });
  async function persist() {
    if (!edit) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/api/v1/clinical-templates${edit.id ? `/${edit.id}` : ""}`, {
        method: edit.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...edit,
          shared,
          specialtyId: Number(edit.specialtyId),
          version: edit.version ?? 0,
        }),
      });
      setEdit(null);
      await cache.invalidateQueries({ queryKey: ["clinical-templates", me.data?.id] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không lưu được mẫu");
    } finally {
      setBusy(false);
    }
  }
  async function state(t: ClinicalTemplate, action: string) {
    try {
      await api(`/api/v1/clinical-templates/${t.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ version: t.version }),
      });
      await cache.invalidateQueries({ queryKey: ["clinical-templates", me.data?.id] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không cập nhật được mẫu");
    }
  }
  return (
    <div className="space-y-3 no-print">
      <div className="flex gap-3 flex-wrap">
        <h2 className="font-semibold">
          {shared ? "Mẫu bệnh án theo chuyên khoa" : "Mẫu ghi bệnh án"}
        </h2>
        <Button
          variant="ghost"
          onClick={() =>
            setEdit({
              name: "",
              specialtyId: specialtyId ?? specialties.data?.[0]?.id,
              chiefComplaint: "",
              diagnosis: "",
              conclusion: "",
              instructions: "",
            })
          }
        >
          Tạo mẫu {shared ? "dùng chung" : "cá nhân"}
        </Button>
      </div>
      <QueryState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />
      {message && <Notice>{message}</Notice>}
      <div className="flex flex-wrap gap-2">
        {q.data
          ?.filter((t) =>
            shared ? t.ownerStaffId === null : t.state === "PUBLISHED" || t.ownerStaffId !== null,
          )
          .map((t) => (
            <div className="border border-line rounded p-2 space-y-1" key={t.id}>
              <strong>{t.name}</strong>
              <p className="text-xs">
                v{t.version} · {t.authorName} · {t.state}
              </p>
              {form && t.state === "PUBLISHED" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelected(t);
                    setOverwrite([]);
                  }}
                >
                  Xem trước / áp dụng
                </Button>
              )}
              {(shared || t.ownerStaffId !== null) && (
                <>
                  <Button variant="ghost" onClick={() => setEdit(t)}>
                    Sửa mẫu
                  </Button>
                  {shared && t.state !== "PUBLISHED" && (
                    <Button variant="ghost" onClick={() => void state(t, "publish")}>
                      Xuất bản
                    </Button>
                  )}
                  {t.state !== "INACTIVE" && (
                    <Button variant="ghost" onClick={() => void state(t, "deactivate")}>
                      Ngưng sử dụng
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
        title={edit?.id ? "Sửa mẫu bệnh án" : "Tạo mẫu bệnh án"}
        busy={busy}
        dirty={!!edit}
      >
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            void persist();
          }}
          className="space-y-3"
        >
          <Field label="Tên mẫu">
            <TextInput
              required
              maxLength={200}
              value={edit?.name ?? ""}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          </Field>
          <Field label="Chuyên khoa">
            <SelectInput
              required
              value={edit?.specialtyId ?? ""}
              onChange={(e) => setEdit({ ...edit, specialtyId: Number(e.target.value) })}
            >
              <option value="">Chọn chuyên khoa</option>
              {specialties.data
                ?.filter((s) => shared || !specialtyId || s.id === specialtyId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </SelectInput>
          </Field>
          {templateFields.map(([key, label]) => (
            <Field key={key} label={label}>
              <TextArea
                maxLength={key === "chiefComplaint" ? 1000 : 10000}
                value={edit?.[key] ?? ""}
                onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
              />
            </Field>
          ))}
          <p className="text-sm text-muted">
            Mẫu chỉ lưu nội dung ghi khám. Hãy kiểm tra nội dung trước khi dùng cho từng bệnh nhân.
          </p>
          <Button type="submit" busy={busy}>
            Lưu mẫu
          </Button>
          {message && <Notice>{message}</Notice>}
        </Form>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={`Xem trước: ${selected?.name ?? ""}`}
      >
        <div className="space-y-3">
          {selected &&
            templateFields.map(([key, label]) => (
              <div key={key}>
                <strong>{label}</strong>
                <p className="whitespace-pre-wrap">{selected[key] || "Không điền nội dung"}</p>
                {!!form?.[key]?.trim() && (
                  <Checkbox
                    label={`Ghi đè ${label.toLowerCase()} đang nhập`}
                    checked={overwrite.includes(key)}
                    onChange={(e) =>
                      setOverwrite(
                        e.target.checked ? [...overwrite, key] : overwrite.filter((k) => k !== key),
                      )
                    }
                  />
                )}
              </div>
            ))}
          <p>Mặc định chỉ điền trường trống. Nội dung áp dụng là nháp để bác sĩ chỉnh sửa.</p>
          <Button
            onClick={() => {
              if (selected && form && onApply) {
                onApply(applyTemplate(form, selected, overwrite), {
                  templateId: selected.id,
                  version: selected.version,
                });
                setSelected(null);
              }
            }}
          >
            Áp dụng vào nháp
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function DiagnosticHistoryPanel({ encounterId }: { encounterId: number }) {
  const [filter, setFilter] = useState({ from: vietnamDate(-365), to: vietnamDate() });
  const [group, setGroup] = useState("");
  const me = useUser();
  const q = useQuery({
    queryKey: ["diagnostic-history", encounterId, filter, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<DiagnosticHistory>(
        `/api/v1/encounters/${encounterId}/diagnostic-history${queryString(filter)}`,
        { signal },
      ),
  });
  const groups = new Map<string, string>();
  for (const p of q.data?.points ?? [])
    groups.set(
      measurementGroup(p),
      `${p.serviceName} · ${p.name} (${p.unit || "không có đơn vị"})${p.comparable ? "" : " · chưa đủ dữ liệu ghép"}`,
    );
  const selected = group || groups.keys().next().value || "";
  const points = (q.data?.points ?? []).filter((p) => measurementGroup(p) === selected);
  const numeric = points.filter((p) => p.comparable && p.numericValue !== null);
  return (
    <Card className="no-print space-y-3">
      <Disclosure title="Diễn biến kết quả">
        <div className="space-y-3 mt-3">
          <div className="flex gap-3 flex-wrap">
            <Field label="Từ ngày">
              <TextInput
                type="date"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              />
            </Field>
            <Field label="Đến ngày">
              <TextInput
                type="date"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              />
            </Field>
            <Field label="Dịch vụ / chỉ số / đơn vị">
              <SelectInput value={selected} onChange={(e) => setGroup(e.target.value)}>
                {[...groups].map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <QueryState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />
          {q.data?.ambiguousMeasurements ? (
            <Notice>
              {q.data.ambiguousMeasurements} chỉ số cũ chưa xác định được duy nhất; hiển thị riêng
              để tra cứu.
            </Notice>
          ) : null}
          {numeric.length >= 2 && (
            <div className="h-64 w-full" aria-label="Biểu đồ diễn biến kết quả">
              <ClinicalHistoryChart
                data={numeric.map((p) => ({
                  date: formatDateTime(p.publishedAt),
                  numericValue: p.numericValue,
                }))}
                unit={points[0]?.unit || "Giá trị"}
              />
            </div>
          )}
          {points.length === 0 ? (
            <p>Chưa có kết quả đã công bố trong khoảng chọn.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày công bố</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead>Khoảng tham chiếu tại thời điểm trả</TableHead>
                    <TableHead>Nguồn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDateTime(p.publishedAt)}</TableCell>
                      <TableCell>{p.value}</TableCell>
                      <TableCell>{p.unit || "—"}</TableCell>
                      <TableCell>{p.referenceRange || "—"}</TableCell>
                      <TableCell>
                        <Link className="underline" href={p.href}>
                          Kết quả gốc #{p.resultId}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {points.length > 0 && numeric.length < 2 && (
            <p className="text-sm text-muted">
              Chưa đủ hai kết quả số cùng chỉ số và đơn vị để vẽ diễn biến.
            </p>
          )}
        </div>
      </Disclosure>
    </Card>
  );
}

export function MedicationAvailability({ lines }: { lines: PrescriptionLine[] }) {
  const [counter, setCounter] = useState("");
  const ids = [...new Set(lines.map((l) => l.medicationId).filter((id) => id > 0))];
  const all = useQuery({
    queryKey: ["medication-availability", ids],
    queryFn: () =>
      api<Availability>("/api/v1/prescriptions/medication-availability", {
        method: "POST",
        body: JSON.stringify({ medicationIds: ids }),
      }),
    enabled: ids.length > 0,
    refetchInterval: 30000,
  });
  const counters = new Map<number, string>();
  for (const m of all.data?.medications ?? [])
    for (const c of m.counters) counters.set(c.counterId, c.counterName);
  return (
    <div className="space-y-2">
      <Field label="Kiểm tra khả năng cấp tại quầy">
        <SelectInput
          value={counter}
          onChange={(e) => {
            setCounter(e.target.value);
            void all.refetch();
          }}
        >
          <option value="">Tổng tất cả quầy đang hoạt động</option>
          {[...counters].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <p className="text-xs text-muted">
        Tồn khả dụng là thông tin tham khảo khi kê; quầy thuốc kiểm tra và giữ tồn lúc cấp.
      </p>
      {all.error && (
        <Notice>
          Chưa xác định tồn.{" "}
          <Button variant="ghost" onClick={() => void all.refetch()}>
            Thử lại
          </Button>
        </Notice>
      )}
      {ids.map((id) => {
        const stock = all.data?.medications.find((m) => m.medicationId === id);
        const available = stock
          ? counter
            ? (stock.counters.find((c) => c.counterId === Number(counter))?.available ?? 0)
            : stock.available
          : null;
        const need = lines
          .filter((l) => l.medicationId === id)
          .reduce((s, l) => s + (Number(l.quantity) || 0), 0);
        return (
          <div key={id} className="text-sm">
            <strong>{lines.find((l) => l.medicationId === id)?.name || `Thuốc #${id}`}</strong> · kê
            tổng {formatQuantity(need)} ·{" "}
            {all.error || available === null
              ? "Chưa xác định tồn"
              : `${Number(available) <= 0 ? "Hết" : Number(available) < need ? "Thiếu" : "Đủ"} · khả dụng ${formatQuantity(available)} ${stock?.unit ?? ""}`}{" "}
            {!counter &&
              stock?.counters.map((c) => (
                <span key={c.counterId}>
                  {" "}
                  · {c.counterName}: {formatQuantity(c.available)}
                </span>
              ))}
          </div>
        );
      })}
      {all.data && !all.error && (
        <p className="text-xs text-muted">
          Kiểm tra lúc {formatDateTime(all.data.checkedAt)}{" "}
          <Button variant="ghost" onClick={() => void all.refetch()}>
            Làm mới
          </Button>
        </p>
      )}
    </div>
  );
}
