"use client";
import type { ClinicalEncounter } from "@/lib/clinical-safety";
import type { PrescriptionLine } from "@/lib/outpatient";
import { Checkbox } from "@/components/ui/primitives";
export type DraftConflict = {
  kind: "CHART" | "RX";
  server: ClinicalEncounter | PrescriptionLine[];
  revision: number;
};
const chartFieldLabels: Record<string, string> = {
  chiefComplaint: "Lý do khám",
  medicalHistory: "Tiền sử",
  allergies: "Dị ứng",
  vitals: "Sinh hiệu",
  diagnosis: "Chẩn đoán",
  conclusion: "Kết luận",
  instructions: "Hướng dẫn",
  followUpDate: "Ngày tái khám",
  diagnoses: "Mã chẩn đoán",
};
function chartContent(value: unknown) {
  if (Array.isArray(value))
    return (
      value
        .map((d) => `${d.code} · ${d.nameVi || d.nameEn || ""}${d.primary ? " (chính)" : ""}`)
        .join("; ") || "Chưa ghi"
    );
  return String(value ?? "") || "Chưa ghi";
}
function prescriptionContent(lines: PrescriptionLine[]) {
  return (
    lines
      .map(
        (l) =>
          `${l.name || `Thuốc #${l.medicationId}`} · ${l.dose || "chưa ghi liều"} · ${l.route || "chưa ghi đường dùng"} · ${l.frequency || "chưa ghi số lần"} · ${l.days} ngày · số lượng ${l.quantity}${l.instructions ? ` · ${l.instructions}` : ""}`,
      )
      .join("\n") || "Chưa có thuốc"
  );
}

export function ClinicalDraftComparison({
  conflict,
  form,
  rx,
  serverChoices,
  onChoices,
}: {
  conflict: DraftConflict | null;
  form: ClinicalEncounter | null | undefined;
  rx: PrescriptionLine[];
  serverChoices: string[];
  onChoices: (choices: string[]) => void;
}) {
  return (
    <>
      {" "}
      {conflict?.kind === "CHART" &&
        form &&
        (
          [
            "chiefComplaint",
            "medicalHistory",
            "allergies",
            "vitals",
            "diagnosis",
            "conclusion",
            "instructions",
            "followUpDate",
            "diagnoses",
          ] as const
        ).map((key) => {
          const server = conflict.server as ClinicalEncounter;
          if (JSON.stringify(form[key]) === JSON.stringify(server[key])) return null;
          return (
            <div className="border border-line rounded p-3" key={key}>
              <strong>{chartFieldLabels[key]}</strong>
              <p className="whitespace-pre-wrap">Đang nhập: {chartContent(form[key])}</p>
              <p className="whitespace-pre-wrap">Máy chủ: {chartContent(server[key])}</p>
              <Checkbox
                label="Lấy nội dung máy chủ"
                checked={serverChoices.includes(key)}
                onChange={(e) =>
                  onChoices(
                    e.target.checked
                      ? [...serverChoices, key]
                      : serverChoices.filter((k) => k !== key),
                  )
                }
              />
            </div>
          );
        })}
      {conflict?.kind === "RX" && (
        <>
          <p className="whitespace-pre-wrap">Đang nhập: {prescriptionContent(rx)}</p>
          <p className="whitespace-pre-wrap">
            Máy chủ: {prescriptionContent(conflict.server as PrescriptionLine[])}
          </p>
          <Checkbox
            label="Giữ toàn bộ đơn thuốc trên máy chủ"
            checked={serverChoices.includes("lines")}
            onChange={(e) => onChoices(e.target.checked ? ["lines"] : [])}
          />
        </>
      )}
    </>
  );
}
