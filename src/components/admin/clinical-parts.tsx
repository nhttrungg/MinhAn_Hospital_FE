"use client";
import { AlertTriangle, Check, Lock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Diagnosis } from "@/lib/clinical-safety";

export function DiagnosisCodes({ diagnoses }: { diagnoses: Diagnosis[] }) {
  if (!diagnoses.length) return null;
  return (
    <div className="space-y-1 text-sm">
      <strong>Mã chẩn đoán (demo)</strong>
      {diagnoses.map((d) => (
        <p key={d.code}>
          {d.code} · {d.nameVi} {d.primary && "· Chính"} · {d.sourceSystem}
        </p>
      ))}
    </div>
  );
}

export type Tone = "danger" | "warning" | "success" | "neutral" | "info";

/** Explicit status → badge tone for the clinical workflow (prescriptions, dispensing, lab, slots). */
export function statusTone(status: string): Tone {
  switch (status) {
    case "DELIVERED":
    case "PAID":
    case "COMPLETED":
    case "PUBLISHED":
    case "FINAL":
    case "COLLECTED":
      return "success";
    case "READY":
    case "ACCEPTED":
    case "IN_PROGRESS":
    case "OPEN":
    case "WAITING_RESULTS":
      return "info";
    case "DRAFT":
    case "SUBMITTED":
    case "CLOSE_REQUESTED":
    case "PARTIAL":
    case "ISSUED":
    case "WAITING":
      return "warning";
    case "CANCELLED":
    case "VOID":
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

/** Section wrapper used by the encounter page: anchor target + heading + optional actions. */
export function SectionHead({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="cl-section-head">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="cl-badges">{actions}</div>}
    </div>
  );
}

const NO_ALLERGY = /^(không|chưa|khong|chua|none|no |n\/a|-|—)/i;

/** Joins the distinct non-empty allergy notes; `known` is false when they only say "none / not recorded". */
export function allergySummary(...notes: (string | null | undefined)[]) {
  const unique = [
    ...new Set(notes.map((note) => note?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean)),
  ];
  const known = unique.filter((note) => !NO_ALLERGY.test(note));
  return {
    known: known.length > 0,
    text: known.length ? known.join(" · ") : (unique[0] ?? ""),
  };
}

export function AllergyAlert({
  allergies,
  compact = false,
  context,
}: {
  allergies: string;
  compact?: boolean;
  context?: string;
}) {
  const { known, text } = allergySummary(allergies);
  if (compact) {
    return known ? (
      <span className="cl-allergy-chip" title={`Dị ứng: ${text}`}>
        <AlertTriangle size={14} aria-hidden />
        <span>Dị ứng: {text}</span>
      </span>
    ) : null;
  }
  return (
    <div className="cl-allergy" data-known={known} role={known ? "alert" : undefined}>
      {known ? <AlertTriangle size={20} aria-hidden /> : <ShieldCheck size={20} aria-hidden />}
      <div>
        {known ? (
          <>
            <strong>Cảnh báo dị ứng:</strong> {text}
            {context && <div>{context}</div>}
          </>
        ) : (
          <>
            <strong>Dị ứng:</strong> {text || "Chưa khai báo"}. Hỏi lại bệnh nhân trước khi kê đơn.
          </>
        )}
      </div>
    </div>
  );
}

export function ReadOnlyBanner({ children }: { children: ReactNode }) {
  return (
    <div className="cl-readonly">
      <Lock size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export type WorkflowStep = { key: string; label: string; state: "done" | "active" | "todo" };

/** Horizontal workflow tracker (collect → enter → submit → review). */
export function WorkflowSteps({ steps, label }: { steps: WorkflowStep[]; label: string }) {
  return (
    <ol className="cl-steps" aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          data-state={step.state}
          aria-current={step.state === "active" ? "step" : undefined}
        >
          <span className="cl-step-dot" aria-hidden>
            {step.state === "done" ? <Check size={14} /> : index + 1}
          </span>
          <span>
            {step.label}
            <span className="sr-only">
              {step.state === "done"
                ? " (đã xong)"
                : step.state === "active"
                  ? " (bước hiện tại)"
                  : " (chưa tới)"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Parses the common textual reference ranges: "3.9 - 6.1", "< 5", "> 40", "≥ 1.2". */
export function parseRange(range: string): { min?: number; max?: number } | null {
  const text = range.replace(/,/g, ".").trim();
  const num = "(-?\\d+(?:\\.\\d+)?)";
  const between = text.match(new RegExp(`^${num}\\s*[-–—]\\s*${num}`));
  if (between) return { min: Number(between[1]), max: Number(between[2]) };
  const below = text.match(new RegExp(`^[<≤]\\s*=?\\s*${num}`));
  if (below) return { max: Number(below[1]) };
  const above = text.match(new RegExp(`^[>≥]\\s*=?\\s*${num}`));
  if (above) return { min: Number(above[1]) };
  return null;
}

/** "high" / "low" when a numeric result is outside its textual reference range, otherwise null. */
export function compareToRange(raw: string, range: string): "high" | "low" | "ok" | null {
  const parsed = parseRange(range);
  const number = Number(raw.replace(/,/g, ".").trim());
  if (!parsed || !raw.trim() || !Number.isFinite(number)) return null;
  if (parsed.max !== undefined && number > parsed.max) return "high";
  if (parsed.min !== undefined && number < parsed.min) return "low";
  return "ok";
}
