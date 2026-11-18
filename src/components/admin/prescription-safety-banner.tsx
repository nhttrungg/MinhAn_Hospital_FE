"use client";
import { Notice } from "@/components/ui";
import type { SafetyWarning } from "@/lib/clinical-safety";
import { requiresOverride } from "@/lib/clinical-safety";
export function PrescriptionSafetyBanner({ warnings }: { warnings: SafetyWarning[] }) {
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm text-muted">
        Kiểm tra demo chỉ so khớp hoạt chất và cặp mẫu. Không có cảnh báo không có nghĩa đơn an
        toàn.
      </p>
      {warnings.length > 0 && (
        <Notice tone={requiresOverride(warnings) ? "error" : "warning"}>
          <strong>
            {requiresOverride(warnings) ? "Cần giải trình trước khi lưu" : "Cảnh báo kê đơn"}
          </strong>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>
                {w.message} · {w.severity}
              </li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}
