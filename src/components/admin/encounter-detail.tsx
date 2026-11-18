"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import { PageHeader } from "@/components/ui/data-display";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { DraftQueue } from "@/lib/clinical-drafts";
import { useClinicalAutosave, draftStatusLabels } from "@/hooks/use-clinical-autosave";
import type { ChartSaved, RxSaved, TemplateApplication } from "@/lib/clinical-productivity";
import {
  ClinicalTemplates,
  PatientSummaryPanel,
  DiagnosticHistoryPanel,
  MedicationAvailability,
} from "./clinical-productivity-parts";
import { api, allOptions, ApiError } from "@/lib/api";
import {
  type ClinicalEncounter,
  type SafetyPrescription,
  type SafetyWarning,
  requiresOverride,
} from "@/lib/clinical-safety";
import { Icd10Picker } from "./icd10-picker";
import { PrescriptionSafetyBanner } from "./prescription-safety-banner";
import { PatientAllergies } from "./patient-allergies";
import { DiagnosisCodes } from "./clinical-parts";
import { Dialog, Tabs } from "@/components/ui/overlays";
import { formatDateTime, formatQuantity } from "@/lib/format";
import type { PageResult, StaffAccount } from "@/lib/types";
import type { Encounter, Medication, NurseReference, PrescriptionLine } from "@/lib/outpatient";
import { DocumentButton, QrButton } from "@/components/workflow-tools";
import { DiagnosticsWorkspace } from "./diagnostics-workspace";
import { rows, value, type Row } from "@/lib/workflow";
import { encounterLabels, vietnamDate } from "@/lib/outpatient";
import {
  Button,
  Card,
  Field,
  Notice,
  SelectInput,
  TextArea,
  TextInput,
  Form,
  Checkbox,
  Fieldset,
  StatusBadge,
} from "@/components/ui";
import { PrintLetterhead, QueryState, useUser } from "@/components/workspace-ui";
import { ClinicalDraftComparison, type DraftConflict } from "./clinical-draft-comparison";
import { EncounterHistory } from "./encounter-history";
import { VitalsFields } from "./vitals-fields";
function medicationDisplay(name: string, strength?: string | null) {
  if (!strength || !strength.trim()) return name;
  const s = strength.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (
    n.includes(s) ||
    (s.replace(/\s+/g, "").length > 0 && n.replace(/\s+/g, "").includes(s.replace(/\s+/g, "")))
  ) {
    return name;
  }
  return `${name} ${strength}`;
}
export function EncounterDetail({ id, portal = false }: { id: number; portal?: boolean }) {
  const cache = useQueryClient();
  const me = useUser();
  const doctor = me.data?.roles.includes("DOCTOR") ?? false;
  const self = useQuery({
    queryKey: ["staff-me", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<StaffAccount>("/api/v1/staff-accounts/me", { signal }),
    enabled: doctor,
  });
  const encounter = useQuery({
    queryKey: ["encounter", id, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<ClinicalEncounter>(`/api/v1/encounters/${id}`, { signal }),
  });
  const prescriptions = useQuery({
    queryKey: ["prescriptions", id, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<SafetyPrescription[]>(`/api/v1/prescriptions/encounters/${id}`, { signal }),
    enabled: !!encounter.data && (doctor || me.data?.userType === "PATIENT"),
  });
  const nurses = useQuery({
    queryKey: ["encounter-nurses"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<NurseReference[]>("/api/v1/encounters/nurses", { signal }),
    enabled:
      doctor &&
      !!encounter.data &&
      self.data?.id === encounter.data.doctorId &&
      encounter.data.status !== "COMPLETED",
  });
  const medications = useQuery({
    queryKey: ["medications", "active"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Medication>("/api/v1/catalog/medications?active=true", { signal }),
    enabled: doctor,
  });
  const [draft, setDraft] = useState<ClinicalEncounter | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [approvedOverride, setApprovedOverride] = useState("");
  const [lines, setLines] = useState<PrescriptionLine[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rxReason, setRxReason] = useState("");
  const [chartReason, setChartReason] = useState("");
  const [amendment, setAmendment] = useState("");
  const [reviseRx, setReviseRx] = useState(false);
  const [reviseChart, setReviseChart] = useState(false);
  const [nurseId, setNurseId] = useState("");
  const [remainingConfirmed, setRemainingConfirmed] = useState(false);
  const fulfillment = useQuery({
    queryKey: ["fulfillment", id, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row>(`/api/v1/pharmacy/encounters/${id}/fulfillment`, { signal }),
    enabled: doctor && encounter.data?.status === "COMPLETED",
  });
  const current = encounter.data;
  const editable = !!current && doctor && self.data?.id === current.doctorId;
  const form = draft ?? current;
  const latest = prescriptions.data?.[0];
  const rx = lines ?? latest?.lines ?? [];
  const [application, setApplication] = useState<TemplateApplication | null>(null);
  const [diagnosticTab, setDiagnosticTab] = useState("orders");
  const queue = useRef(new DraftQueue());
  const serverEncounter = useRef(current);
  serverEncounter.current = current;
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const [serverChoices, setServerChoices] = useState<string[]>([]);
  async function validateRestore() {
    const c = await api<ClinicalEncounter>(`/api/v1/encounters/${id}`);
    if (c.status !== "IN_PROGRESS" || c.doctorId !== self.data?.id)
      throw new Error("Nháp chỉ được khôi phục vào lượt đang khám do bạn phụ trách.");
  }
  const chartSave = useClinicalAutosave({
    accountId: me.data?.id,
    encounterId: id,
    kind: "CHART",
    enabled: editable && current?.status === "IN_PROGRESS",
    value: draft ? { draft, template: application } : null,
    revision: current?.revision ?? 0,
    queue: queue.current,
    valid: () => true,
    validateRestore,
    save: async (value, revision, requestId) => {
      const result = await api<ChartSaved>(`/api/v1/encounters/${id}/draft-sync`, {
        method: "PUT",
        body: JSON.stringify({
          requestId,
          draft: { ...value.draft, revision },
          template: value.template,
        }),
      });
      serverEncounter.current = result.data;
      cache.setQueryData(["encounter", id, me.data?.id], result.data);
      return result;
    },
    onSaved: (_value, edited) => {
      if (!edited) {
        setDraft(null);
        setApplication(null);
      }
    },
  });
  const rxSave = useClinicalAutosave({
    accountId: me.data?.id,
    encounterId: id,
    kind: "RX",
    enabled: editable && current?.status === "IN_PROGRESS",
    value: lines ? { lines, overrideReason: approvedOverride } : null,
    revision: latest?.status === "DRAFT" ? latest.revision : 0,
    queue: queue.current,
    valid: (value) =>
      value.lines.every(
        (l) =>
          l.medicationId > 0 &&
          l.dose.trim() &&
          l.route.trim() &&
          l.frequency.trim() &&
          l.days >= 1 &&
          l.days <= 365 &&
          Number(l.quantity) > 0,
      ),
    validateRestore,
    save: async (value, revision, requestId) => {
      const result = await api<RxSaved>(`/api/v1/prescriptions/encounters/${id}/draft-sync`, {
        method: "PUT",
        body: JSON.stringify({
          requestId,
          draft: {
            revision,
            encounterRevision: serverEncounter.current?.revision ?? 0,
            lines: value.lines,
            overrideReason: value.overrideReason,
          },
        }),
      });
      cache.setQueryData(
        ["prescriptions", id, me.data?.id],
        [result.data, ...(prescriptions.data ?? []).filter((p) => p.id !== result.data.id)],
      );
      return result;
    },
    onSaved: (_value, edited) => {
      if (!edited) setLines(null);
    },
  });
  async function resolveConflict(kind: "CHART" | "RX") {
    setServerChoices([]);
    if (kind === "CHART") {
      const c = await api<ClinicalEncounter>(`/api/v1/encounters/${id}`);
      setConflict({ kind, server: c, revision: c.revision });
    } else {
      const p = await api<SafetyPrescription[]>(`/api/v1/prescriptions/encounters/${id}`);
      setConflict({
        kind,
        server: p[0]?.lines ?? [],
        revision: p[0]?.status === "DRAFT" ? p[0].revision : 0,
      });
    }
  }
  async function flushDrafts() {
    for (let i = 0; i < 3; i++) {
      if (!(await chartSave.flush())) continue;
      if (await rxSave.flush()) return true;
    }
    return false;
  }
  const safety = useQuery({
    queryKey: ["prescription-safety", id, rx.map((l) => l.medicationId), me.data?.id],
    queryFn: () =>
      api<SafetyWarning[]>(`/api/v1/prescriptions/encounters/${id}/check`, {
        method: "POST",
        body: JSON.stringify({
          medicationIds: rx.map((l) => l.medicationId).filter((id) => id > 0),
        }),
      }),
    enabled: editable && (current?.status === "IN_PROGRESS" || reviseRx),
  });
  const [historyFilter, setHistoryFilter] = useState({
    from: vietnamDate(-365),
    to: vietnamDate(),
    page: 0,
  });
  const history = useQuery({
    queryKey: ["encounter-history", current?.patientId, historyFilter, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Encounter>>(
        `/api/v1/encounters/search?patientId=${current?.patientId}&from=${historyFilter.from}&to=${historyFilter.to}&page=${historyFilter.page}&size=20`,
        { signal },
      ),
    enabled: editable && current?.status === "IN_PROGRESS",
  });
  async function refresh() {
    await invalidateDataGroups(cache, [
      "encounter",
      "prescriptions",
      "prescription-safety",
      "fulfillment",
      "doctor-queue",
      "nursing-encounters",
      "appointment",
      "reception-appointments",
      "records",
      "diagnostic",
      "bottlenecks",
      "dashboard-overview",
      "dashboard-workload",
    ]);
  }
  async function action(operation: string, body: unknown, method = "POST") {
    setBusy(true);
    setMessage("");
    try {
      if (["complete", "wait-results"].includes(operation)) {
        if (!(await flushDrafts()))
          throw new Error(
            "Chưa lưu đủ bệnh án và đơn thuốc lên máy chủ. Hãy xử lý thông tin thiếu, cảnh báo hoặc xung đột.",
          );
        body = { revision: serverEncounter.current?.revision };
      }
      await api(`/api/v1/encounters/${id}/${operation}`, { method, body: JSON.stringify(body) });
      if (operation === "complete") {
        await chartSave.discard();
        await rxSave.discard();
      }
      setDraft(null);
      setMessage("Đã lưu thành công.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không cập nhật được bệnh án.");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (form) {
      const saved = await chartSave.flush();
      setMessage(
        saved ? "Đã lưu bệnh án trên máy chủ." : "Bệnh án chưa đồng bộ. Xem trạng thái lưu nháp.",
      );
    }
  }
  async function saveRx(event: FormEvent) {
    event.preventDefault();
    await persistRx();
  }
  async function persistRx(reason?: string) {
    if (!current) return;
    if (current.status === "IN_PROGRESS") {
      if (reason?.trim()) {
        setApprovedOverride(reason.trim());
        setOverrideOpen(false);
        return;
      }
      if (!(await chartSave.flush())) {
        setMessage("Lưu bệnh án trước khi lưu đơn thuốc.");
        return;
      }
      if (await rxSave.flush()) setMessage("Đã lưu đơn thuốc trên máy chủ.");
      else if (rxSave.status !== "conflict") {
        setMessage("Đơn thuốc chưa đồng bộ. Kiểm tra thông tin và cảnh báo.");
        if (requiresOverride(safety.data ?? [])) setOverrideOpen(true);
      }
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const warnings = await api<SafetyWarning[]>(`/api/v1/prescriptions/encounters/${id}/check`, {
        method: "POST",
        body: JSON.stringify({ medicationIds: rx.map((l) => l.medicationId) }),
      });
      cache.setQueryData(
        ["prescription-safety", id, rx.map((l) => l.medicationId), me.data?.id],
        warnings,
      );
      if (requiresOverride(warnings) && !reason?.trim()) {
        setOverrideReason("");
        setOverrideOpen(true);
        return;
      }
      await api(
        `/api/v1/prescriptions/encounters/${id}/${current.status === "COMPLETED" ? "versions" : "draft"}`,
        {
          method: current.status === "COMPLETED" ? "POST" : "PUT",
          body: JSON.stringify({
            revision:
              current.status === "COMPLETED"
                ? (latest?.version ?? 0)
                : latest?.status === "DRAFT"
                  ? latest.revision
                  : 0,
            encounterRevision: current.revision,
            reason: rxReason,
            lines: rx,
            remainingQuantityConfirmed: remainingConfirmed,
            overrideReason: reason?.trim(),
          }),
        },
      );
      setLines(null);
      setRxReason("");
      setReviseRx(false);
      setOverrideOpen(false);
      setOverrideReason("");
      setMessage("Đã lưu đơn thuốc.");
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.problem.code === "SAFETY_OVERRIDE_REQUIRED") {
        setOverrideReason("");
        setOverrideOpen(true);
        await safety.refetch();
      }
      setMessage(e instanceof Error ? e.message : "Không lưu được đơn thuốc.");
    } finally {
      setBusy(false);
    }
  }
  function field(key: keyof Encounter, value: string) {
    if (form) setDraft({ ...form, [key]: value || null });
  }
  function updateLine(index: number, key: keyof PrescriptionLine, value: string | number) {
    setLines(rx.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  }
  const Container = portal ? "main" : "section";
  return (
    <Container className="space-y-5">
      <QueryState loading={encounter.isLoading} error={encounter.error} />
      {current && (
        <>
          {doctor && (
            <QueryState
              loading={self.isLoading}
              error={self.error}
              retry={() => void self.refetch()}
            />
          )}
          <div className="no-print flex flex-wrap items-start justify-between gap-3">
            <PageHeader
              eyebrow={portal ? "Hồ sơ khám bệnh" : "Bệnh án điện tử"}
              title={
                <>
                  {current.patientName} · {current.appointmentCode}
                </>
              }
              description={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StatusBadge status={current.status}>
                    {encounterLabels[current.status]}
                  </StatusBadge>
                  <span>· Bác sĩ {current.doctorName}</span>
                </span>
              }
            />
            {current.status === "COMPLETED" && (
              <DocumentButton type="EXAMINATION_RESULT" sourceId={id} label="PDF kết quả khám" />
            )}
          </div>
          {editable && current.status === "IN_PROGRESS" && (
            <nav className="cl-bar no-print" aria-label="Điều hướng nhanh bệnh án">
              <div className="cl-bar-nav">
                <a href="#chart-section">Khám & Chẩn đoán</a>
                <a href="#diagnostics-section">Cận lâm sàng</a>
                <a href="#rx-section">Đơn thuốc ({rx.length})</a>
                <a href="#history-section">Lịch sử khám</a>
              </div>
              {current.patientAllergies && (
                <span className="cl-allergy-chip" title={`Dị ứng: ${current.patientAllergies}`}>
                  <span>Dị ứng: {current.patientAllergies}</span>
                </span>
              )}
            </nav>
          )}
          {editable && <PatientSummaryPanel encounterId={id} />}
          {editable && current.status === "IN_PROGRESS" && (
            <Card className="no-print space-y-3">
              {(
                [
                  ["Bệnh án", chartSave],
                  ["Đơn thuốc", rxSave],
                ] as const
              ).map(([label, s]) => (
                <div key={label}>
                  <strong>
                    {label}: {draftStatusLabels[s.status]}
                  </strong>
                  {s.savedAt && <span> · {formatDateTime(s.savedAt)}</span>}
                  {s.error && <p className="text-sm text-danger">{s.error}</p>}
                  {s.status === "conflict" && (
                    <Button
                      variant="ghost"
                      onClick={() => void resolveConflict(label === "Bệnh án" ? "CHART" : "RX")}
                    >
                      So sánh với máy chủ
                    </Button>
                  )}
                  {s.recovery && (
                    <div>
                      <p>
                        Có nháp lưu trên trình duyệt lúc{" "}
                        {formatDateTime(new Date(s.recovery.updatedAt).toISOString())}.
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          void s
                            .restore()
                            .then((value) => {
                              if (value) {
                                if (label === "Bệnh án" && "draft" in value) {
                                  setDraft(value.draft);
                                  setApplication(value.template);
                                } else if ("lines" in value) {
                                  setLines(value.lines);
                                  setOverrideReason(value.overrideReason);
                                }
                              }
                            })
                            .catch((e) => setMessage(e.message))
                        }
                      >
                        Khôi phục nháp
                      </Button>
                      <Button variant="ghost" onClick={() => void s.discard()}>
                        Bỏ nháp
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="ghost" onClick={() => void flushDrafts()}>
                Đồng bộ ngay
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void chartSave.discard();
                  void rxSave.discard();
                  setDraft(null);
                  setLines(null);
                  setApplication(null);
                }}
              >
                Bỏ các thay đổi đang soạn
              </Button>
            </Card>
          )}
          {editable && current.status !== "COMPLETED" && (
            <Card className="no-print space-y-3">
              <h2 className="font-semibold">Phân công điều dưỡng</h2>
              <p className="text-sm">
                {current.nurseName
                  ? `${current.nurseName} đo sinh hiệu trước khi hoàn tất bệnh án.`
                  : "Chưa phân công. Điều dưỡng chỉ thấy lượt này sau khi được chọn."}
              </p>
              <QueryState
                loading={nurses.isLoading}
                error={nurses.error}
                retry={() => void nurses.refetch()}
              />
              <Form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action("assign-nurse", {
                    nurseStaffId: Number(nurseId || current.nurseStaffId),
                  });
                }}
              >
                <Field label="Điều dưỡng">
                  <SelectInput
                    required
                    value={nurseId || current.nurseStaffId || ""}
                    onChange={(e) => setNurseId(e.target.value)}
                  >
                    <option value="">Chọn điều dưỡng</option>
                    {nurses.data?.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.fullName} · {n.departmentName}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !!draft ||
                    lines !== null ||
                    !(nurseId || current.nurseStaffId) ||
                    !nurses.data
                  }
                >
                  Lưu phân công
                </Button>
              </Form>
            </Card>
          )}
          {((editable && current.status !== "COMPLETED") || portal) && (
            <Card className="no-print">
              <PatientAllergies
                key={current.patientId}
                patientId={current.patientId}
                editable={editable || portal}
              />
            </Card>
          )}
          {message && (
            <div className="no-print">
              <Notice>{message}</Notice>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setDraft(null);
                  setLines(null);
                  void refresh();
                }}
              >
                Tải lại dữ liệu
              </Button>
            </div>
          )}
          {current.status === "WAITING" && (
            <Card className="no-print space-y-2">
              <h2 className="font-semibold">Chưa bắt đầu khám</h2>
              <p className="text-sm">
                Phân công điều dưỡng nếu cần đo sinh hiệu. Bắt đầu bệnh án ở hàng chờ sau khi thu
                ngân đã thu đủ công khám.
              </p>
            </Card>
          )}
          {editable && current.status === "IN_PROGRESS" && form ? (
            <Card id="chart-section" className="no-print cl-section">
              <ClinicalTemplates
                specialtyId={self.data?.specialtyId}
                form={form}
                onApply={(next, applied) => {
                  setDraft(next);
                  setApplication(applied);
                }}
              />
              <Form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h2 className="font-semibold">Lý do và tiền sử</h2>
                  <p className="text-sm text-muted">
                    Hồ sơ đang ghi: tiền sử {current.patientMedicalHistory || "chưa khai"} · dị ứng{" "}
                    {current.patientAllergies || "chưa khai"}. Chỉ sửa ở lượt này khi bệnh nhân bổ
                    sung.
                  </p>
                </div>
                {(
                  [
                    ["chiefComplaint", "Lý do khám", 1000],
                    ["medicalHistory", "Tiền sử", 10000],
                    ["allergies", "Dị ứng", 10000],
                  ] as const
                ).map(([key, label, max]) => (
                  <Field key={key} label={label}>
                    <TextArea
                      maxLength={max}
                      value={String(form[key] ?? "")}
                      onChange={(e) => field(key, e.target.value)}
                    />
                  </Field>
                ))}
                <div className="sm:col-span-2">
                  <h2 className="font-semibold">Khám và chẩn đoán</h2>
                  <p className="text-sm text-muted">
                    Sinh hiệu lấy từ điều dưỡng nếu đã đo. Chẩn đoán là kết luận của bác sĩ trước
                    khi quyết định chỉ định thêm.
                  </p>
                </div>
                <VitalsFields
                  value={form.vitals ?? ""}
                  onChange={(value: string) => field("vitals", value)}
                />
                <div className="sm:col-span-2">
                  <Icd10Picker
                    value={form.diagnoses ?? []}
                    onChange={(diagnoses) => setDraft({ ...form, diagnoses })}
                  />
                </div>
                {(
                  [
                    ["diagnosis", "Chẩn đoán"],
                    ["conclusion", "Kết luận"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <TextArea
                      maxLength={10000}
                      value={String(form[key] ?? "")}
                      onChange={(e) => field(key, e.target.value)}
                    />
                  </Field>
                ))}
                <div className="sm:col-span-2">
                  <h2 className="font-semibold">Hướng xử trí</h2>
                </div>
                <Field label="Hướng dẫn và tái khám">
                  <TextArea
                    maxLength={10000}
                    value={String(form.instructions ?? "")}
                    onChange={(e) => field("instructions", e.target.value)}
                  />
                </Field>
                <Field label="Ngày tái khám (nếu có)">
                  <TextInput
                    type="date"
                    value={form.followUpDate ?? ""}
                    onChange={(e) => field("followUpDate", e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2 flex flex-wrap gap-3">
                  <Button disabled={busy} type="submit">
                    Lưu nháp bệnh án
                  </Button>
                  <Button
                    disabled={busy}
                    variant="ghost"
                    type="button"
                    onClick={() => void action("wait-results", { revision: current.revision })}
                  >
                    Chờ kết quả cận lâm sàng
                  </Button>
                  <Button
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Chốt bệnh án và đơn thuốc? Sau khi chốt, sửa đổi phải ghi lý do và tạo phiên bản mới.",
                        )
                      )
                        void action("complete", { revision: current.revision });
                    }}
                  >
                    Hoàn tất khám
                  </Button>
                </div>
                <p className="sm:col-span-2 text-sm text-muted">
                  Dùng “Chờ kết quả cận lâm sàng” khi đã có chỉ định và chưa kết luận được. Lưu nháp
                  bệnh án và đơn thuốc trước khi hoàn tất.
                </p>
              </Form>
            </Card>
          ) : current.status === "WAITING" ? null : (
            <Card className="print-document space-y-3">
              <PrintLetterhead />
              <DiagnosisCodes diagnoses={current.diagnoses ?? []} />
              <h2 className="text-xl font-semibold">Tóm tắt lượt khám</h2>
              <p>
                {current.patientName} · {current.appointmentCode} · {current.doctorName}
              </p>
              <p>{formatDateTime(current.completedAt ?? current.startedAt)}</p>
              {(
                [
                  ["chiefComplaint", "Lý do khám"],
                  ["medicalHistory", "Tiền sử"],
                  ["allergies", "Dị ứng"],
                  ["vitals", "Sinh hiệu"],
                  ["diagnosis", "Chẩn đoán"],
                  ["conclusion", "Kết luận"],
                  ["instructions", "Hướng dẫn"],
                ] as const
              ).map(([key, label]) => (
                <p key={key} className="whitespace-pre-wrap text-sm">
                  <strong>{label}: </strong>
                  {current[key] || "—"}
                </p>
              ))}
              {current.followUpDate && <p>Tái khám: {current.followUpDate}</p>}
              {current.amendments.map((a) => (
                <div key={a.id} className="border-t border-line pt-2">
                  <p>
                    Bổ sung · {formatDateTime(a.createdAt)} · {a.authorName ?? current.doctorName}
                  </p>
                  <p>Lý do: {a.reason}</p>
                  <p className="whitespace-pre-wrap">{a.content}</p>
                </div>
              ))}
            </Card>
          )}
          {(editable || portal || (doctor && current.status === "COMPLETED")) && (
            <div id="diagnostics-section" className="no-print cl-section">
              <Tabs
                value={diagnosticTab}
                onChange={setDiagnosticTab}
                label="Cận lâm sàng trong bệnh án"
                items={[
                  {
                    value: "orders",
                    label: "Chỉ định và kết quả",
                    content: (
                      <DiagnosticsWorkspace
                        canOrder={["IN_PROGRESS", "WAITING_RESULTS"].includes(current.status)}
                        encounterId={id}
                        encounterRevision={current.revision}
                        portal={portal}
                        onChanged={() => void refresh()}
                      />
                    ),
                  },
                  ...(editable
                    ? [
                        {
                          value: "history",
                          label: "Diễn biến kết quả",
                          content: <DiagnosticHistoryPanel encounterId={id} />,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}
          <QueryState loading={prescriptions.isLoading} error={prescriptions.error} />
          {doctor && <QueryState loading={medications.isLoading} error={medications.error} />}
          {editable && current.status === "COMPLETED" && (
            <Card className="no-print space-y-3">
              <h2 className="font-semibold">Điều chỉnh sau khi chốt</h2>
              <p className="text-sm">
                Bệnh án và đơn đã chốt giữ nguyên. Sửa đơn tạo phiên bản mới; thuốc đã giao không
                được tính lại vào số vừa cấp.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => setReviseRx((open) => !open)}>
                  {reviseRx ? "Đóng sửa đơn" : "Sửa đơn thuốc"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReviseChart((open) => !open)}
                >
                  {reviseChart ? "Đóng bổ sung bệnh án" : "Bổ sung bệnh án"}
                </Button>
              </div>
            </Card>
          )}
          {editable &&
            current.status === "COMPLETED" &&
            reviseRx &&
            rows(fulfillment.data, "lines").length > 0 && (
              <Card className="no-print">
                <h2 className="font-semibold">Thuốc đã giao trước khi sửa đơn</h2>
                {rows(fulfillment.data, "lines").map((l, i) => (
                  <p key={i}>
                    {value(l, "name")} {value(l, "strength")} · đã giao {value(l, "delivered")}{" "}
                    {value(l, "unit")} · v{value(l, "version")}
                  </p>
                ))}
                <Checkbox
                  className="flex gap-2"
                  checked={remainingConfirmed}
                  onChange={(e) => setRemainingConfirmed(e.target.checked)}
                  label={<>Đã đối chiếu: số lượng trong đơn mới là phần còn cần cấp.</>}
                />
              </Card>
            )}
          {editable &&
            (current.status === "IN_PROGRESS" || (current.status === "COMPLETED" && reviseRx)) && (
              <Card id="rx-section" className="no-print cl-section">
                <Form onSubmit={saveRx} className="space-y-4">
                  <h2 className="font-semibold">
                    {current.status === "COMPLETED" ? "Phiên bản đơn mới" : "Đơn thuốc nháp"}
                  </h2>
                  <p className="text-sm text-muted">
                    Ghi liều mỗi lần, đường dùng và số lần trong ngày. Số lượng là tổng viên hoặc
                    gói sẽ cấp, không phải liều một lần. Có thể hoàn tất khám khi không kê thuốc.
                  </p>
                  <MedicationAvailability lines={rx} />
                  {rx.map((line, i) => (
                    <Fieldset
                      key={i}
                      legend={<>Thuốc {i + 1}</>}
                      className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                      <Field label="Thuốc">
                        <SelectInput
                          required
                          value={line.medicationId || ""}
                          onChange={(e) => updateLine(i, "medicationId", Number(e.target.value))}
                        >
                          <option value="">Chọn thuốc</option>
                          {medications.data?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {medicationDisplay(m.name, m.strength)}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                      <Field label="Liều mỗi lần">
                        <TextInput
                          required
                          maxLength={100}
                          placeholder="1 viên"
                          value={line.dose}
                          onChange={(e) => updateLine(i, "dose", e.target.value)}
                        />
                      </Field>
                      <Field label="Đường dùng">
                        <TextInput
                          required
                          maxLength={100}
                          placeholder="Uống"
                          value={line.route}
                          onChange={(e) => updateLine(i, "route", e.target.value)}
                        />
                      </Field>
                      <Field label="Số lần trong ngày">
                        <TextInput
                          required
                          maxLength={100}
                          placeholder="Sáng 1, tối 1 sau ăn"
                          value={line.frequency}
                          onChange={(e) => updateLine(i, "frequency", e.target.value)}
                        />
                      </Field>
                      <Field label="Số ngày">
                        <TextInput
                          required
                          type="number"
                          min={1}
                          max={365}
                          value={line.days}
                          onChange={(e) => updateLine(i, "days", Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Số lượng">
                        <TextInput
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, "quantity", e.target.value)}
                        />
                      </Field>
                      <Field label="Lời dặn">
                        <TextInput
                          maxLength={1000}
                          placeholder="Uống sau ăn"
                          value={line.instructions ?? ""}
                          onChange={(e) => updateLine(i, "instructions", e.target.value)}
                        />
                      </Field>
                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => setLines(rx.filter((_, n) => n !== i))}
                      >
                        Bỏ thuốc
                      </Button>
                    </Fieldset>
                  ))}
                  <QueryState
                    loading={safety.isFetching}
                    error={safety.error}
                    retry={() => void safety.refetch()}
                  />
                  <PrescriptionSafetyBanner warnings={safety.data ?? []} />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setLines([
                        ...rx,
                        {
                          medicationId: 0,
                          dose: "",
                          route: "",
                          frequency: "",
                          days: 1,
                          quantity: "1",
                          instructions: "",
                        },
                      ])
                    }
                  >
                    Thêm thuốc
                  </Button>
                  {current.status === "COMPLETED" && (
                    <Field label="Lý do sửa đơn">
                      <TextInput
                        required
                        maxLength={500}
                        value={rxReason}
                        onChange={(e) => setRxReason(e.target.value)}
                      />
                    </Field>
                  )}
                  <div>
                    <Button disabled={busy || !!draft} type="submit">
                      {current.status === "COMPLETED" ? "Chốt phiên bản đơn mới" : "Lưu đơn nháp"}
                    </Button>
                  </div>
                  {!rx.length && (
                    <p className="text-sm text-muted">Không kê thuốc cho lượt khám này.</p>
                  )}
                </Form>
              </Card>
            )}
          {prescriptions.data?.map((p, index) => (
            <Card
              key={p.id}
              className={index === 0 ? "print-document space-y-2" : "no-print space-y-2"}
            >
              <PrintLetterhead />
              <div className="no-print flex flex-wrap gap-2">
                {p.status === "DRAFT" && editable && (
                  <DocumentButton draft type="PRESCRIPTION" sourceId={p.id} label="PDF đơn nháp" />
                )}
                {p.status === "FINAL" && (
                  <>
                    <QrButton kind="PRESCRIPTION" sourceId={p.id} label="QR đơn thuốc" />
                    <DocumentButton type="PRESCRIPTION" sourceId={p.id} label="PDF đơn thuốc" />
                  </>
                )}
              </div>
              <h2 className="font-semibold">
                Đơn thuốc · phiên bản {p.version} · {p.status === "FINAL" ? "Đã chốt" : "Nháp"}
              </h2>
              <p className="text-sm">
                {current.patientName} · {p.authorName} ·{" "}
                {formatDateTime(p.finalizedAt ?? p.createdAt)}
              </p>
              {p.reason && <p>Lý do bổ sung: {p.reason}</p>}
              <DiagnosisCodes diagnoses={current.diagnoses ?? []} />
              {p.overrideReason && <p>Lý do tiếp tục sau cảnh báo: {p.overrideReason}</p>}
              {(p.safetyWarnings?.length ?? 0) > 0 && (
                <PrescriptionSafetyBanner warnings={p.safetyWarnings ?? []} />
              )}
              {p.lines.map((l, i) => (
                <div key={l.id ?? i} className="border-t border-line py-2 text-sm">
                  <strong>
                    {i + 1}. {medicationDisplay(l.name ?? "", l.strength)} —{" "}
                    {formatQuantity(l.quantity)} {l.unit}
                  </strong>
                  <p>
                    {l.dose} · {l.route} · {l.frequency} · {l.days} ngày
                  </p>
                  <p>{l.instructions}</p>
                </div>
              ))}
              {!p.lines.length && <p>Không kê thuốc.</p>}
            </Card>
          ))}
          {editable && current.status === "COMPLETED" && reviseChart && (
            <Card className="no-print">
              <Form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action("amendments", { reason: chartReason, content: amendment });
                }}
              >
                <h2 className="font-semibold">Bổ sung bệnh án</h2>
                <p className="text-sm text-muted">
                  Nội dung bổ sung đứng riêng, không xóa phần đã chốt.
                </p>
                <Field label="Lý do">
                  <TextInput
                    required
                    maxLength={500}
                    value={chartReason}
                    onChange={(e) => setChartReason(e.target.value)}
                  />
                </Field>
                <Field label="Nội dung bổ sung">
                  <TextArea
                    required
                    value={amendment}
                    onChange={(e) => setAmendment(e.target.value)}
                  />
                </Field>
                <Button disabled={busy} type="submit">
                  Lưu bổ sung
                </Button>
              </Form>
            </Card>
          )}
          {editable && current.status === "IN_PROGRESS" && (
            <div id="history-section" className="no-print cl-section">
              <EncounterHistory
                filter={historyFilter}
                onFilter={setHistoryFilter}
                data={history.data}
                loading={history.isLoading}
                error={history.error}
              />
            </div>
          )}
        </>
      )}
      <Dialog
        open={!!conflict}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        title="So sánh nháp và bản máy chủ"
      >
        <div className="space-y-3">
          <p>Bản đang nhập được giữ nguyên. Chọn những trường muốn lấy từ máy chủ.</p>
          <ClinicalDraftComparison
            conflict={conflict}
            form={form}
            rx={rx}
            serverChoices={serverChoices}
            onChoices={setServerChoices}
          />
          <Button
            onClick={() => {
              if (!conflict) return;
              if (conflict.kind === "CHART" && form) {
                const server = conflict.server as ClinicalEncounter;
                const merged = { ...form, revision: server.revision };
                for (const key of serverChoices)
                  Object.assign(merged, { [key]: server[key as keyof ClinicalEncounter] });
                chartSave.rebase(server.revision);
                cache.setQueryData(["encounter", id, me.data?.id], server);
                setDraft(merged);
              } else {
                rxSave.rebase(conflict.revision);
                setLines([
                  ...(serverChoices.includes("lines")
                    ? (conflict.server as PrescriptionLine[])
                    : rx),
                ]);
              }
              setConflict(null);
            }}
          >
            Dùng nội dung đã chọn và lưu lại
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={overrideOpen}
        onOpenChange={(open) => {
          if (!busy) setOverrideOpen(open);
        }}
        busy={busy}
        title="Giải trình cảnh báo kê đơn"
        description="Ghi lý do tiếp tục sau khi đối chiếu dị ứng và tương tác. Dữ liệu cảnh báo là demo."
      >
        <Form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void persistRx(overrideReason);
          }}
        >
          <PrescriptionSafetyBanner warnings={safety.data ?? []} />
          <Field label="Lý do tiếp tục">
            <TextArea
              required
              maxLength={500}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setOverrideOpen(false)}
            >
              Quay lại
            </Button>
            <Button type="submit" disabled={busy || !overrideReason.trim()}>
              Lưu với lý do
            </Button>
          </div>
        </Form>
      </Dialog>
    </Container>
  );
}
