"use client";
import { useEffect, type ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { SegmentedFilter } from "@/components/ui/data-display";

/** Name on the first line, secondary identifier (code, recipient…) on the second. */
export function CellStack({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <span className="at-adm-stack">
      {children}
      {meta && <small>{meta}</small>}
    </span>
  );
}

/** Warns before the tab is closed or reloaded while a form holds unsaved edits. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

const strengthLabels = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh"] as const;

export function passwordChecks(value: string) {
  return [
    { key: "length", label: "Tối thiểu 8 ký tự", met: value.length >= 8, required: true },
    {
      key: "case",
      label: "Có chữ hoa và chữ thường",
      met: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { key: "digit", label: "Có chữ số", met: /\d/.test(value) },
    { key: "symbol", label: "Có ký tự đặc biệt", met: /[^A-Za-z0-9]/.test(value) },
  ];
}

/** Strength meter and checklist. Hints only — the server remains the authority on rules. */
export function PasswordStrength({ value, current }: { value: string; current?: string }) {
  if (!value) {
    return (
      <p className="at-field-hint">Dùng ít nhất 8 ký tự, nên kết hợp chữ hoa, số và ký hiệu.</p>
    );
  }
  const checks = passwordChecks(value);
  const extras = checks.filter((check) => check.met).length - (checks[0].met ? 1 : 0);
  const level = checks[0].met ? Math.min(4, Math.max(1, extras + (value.length >= 12 ? 1 : 0))) : 0;
  const same = !!current && value === current;
  return (
    <div className="at-strength" data-level={level}>
      <div className="at-strength-bar" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} data-on={level >= step} />
        ))}
      </div>
      <p className="at-strength-label" aria-live="polite">
        Độ mạnh: <strong>{strengthLabels[level]}</strong>
      </p>
      <ul className="at-strength-list">
        {checks.map((check) => (
          <li key={check.key} data-met={check.met}>
            {check.met ? <Check size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
            {check.label}
            <span className="sr-only">{check.met ? " — đạt" : " — chưa đạt"}</span>
          </li>
        ))}
      </ul>
      {same && <p className="at-field-error">Mật khẩu mới đang trùng mật khẩu hiện tại.</p>}
    </div>
  );
}

export type ActiveFilter = "" | "true" | "false";
export const activeFilterOptions = [
  { value: "", label: "Tất cả" },
  { value: "true", label: "Đang hoạt động" },
  { value: "false", label: "Đã ngưng" },
];

/** Status quick filter shared by the catalog screens. */
export function ActiveSegmented({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SegmentedFilter
      label="Lọc theo trạng thái"
      options={activeFilterOptions}
      value={value}
      onChange={onChange}
    />
  );
}

/** Small inline pill used for "đã cấu hình" / "chưa cấu hình" style states. */
export function ConfiguredPill({ set, label }: { set: boolean; label?: [string, string] }) {
  const [yes, no] = label ?? ["Đã cấu hình", "Chưa cấu hình"];
  return (
    <span className="at-adm-pill" data-set={set}>
      {set ? <Check size={13} aria-hidden /> : <Circle size={13} aria-hidden />}
      {set ? yes : no}
    </span>
  );
}
