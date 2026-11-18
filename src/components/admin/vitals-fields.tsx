"use client";

import { Field, TextArea, TextInput } from "@/components/ui";

const PARTS = [
  { key: "pulse", label: "Mạch", suffix: "lần/phút", prefix: "Mạch" },
  { key: "bp", label: "Huyết áp", suffix: "mmHg", prefix: "Huyết áp" },
  { key: "temp", label: "Nhiệt độ", suffix: "°C", prefix: "Nhiệt độ" },
  { key: "rr", label: "Nhịp thở", suffix: "lần/phút", prefix: "Nhịp thở" },
  { key: "spo2", label: "SpO2", suffix: "%", prefix: "SpO2" },
  { key: "weight", label: "Cân nặng", suffix: "kg", prefix: "Cân nặng" },
  { key: "height", label: "Chiều cao", suffix: "cm", prefix: "Chiều cao" },
] as const;

function parseVitals(value: string) {
  const parts: Record<string, string> = {};
  let rest = value;
  for (const part of PARTS) {
    const match = rest.match(new RegExp(`(?:^|;)\\s*${part.prefix}:\\s*([^;]*)`));
    if (match) {
      parts[part.key] = match[1].replace(new RegExp(`\\s*${part.suffix}$`), "").trim();
      rest = rest.replace(match[0], "");
    } else parts[part.key] = "";
  }
  return {
    parts,
    note: rest
      .replace(/^[;\s]+|[;\s]+$/g, "")
      .replace(/^Ghi chú:\s*/i, "")
      .trim(),
  };
}

function formatVitals(parts: Record<string, string>, note: string) {
  const bits = PARTS.flatMap((part) => {
    const raw = parts[part.key]?.trim();
    return raw ? [`${part.prefix}: ${raw} ${part.suffix}`] : [];
  });
  if (note.trim()) bits.push(`Ghi chú: ${note.trim()}`);
  return bits.join("; ");
}

export function VitalsFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseVitals(value);
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PARTS.map((part) => (
          <Field key={part.key} label={`${part.label} (${part.suffix})`}>
            <TextInput
              inputMode="decimal"
              value={parsed.parts[part.key]}
              onChange={(event) =>
                onChange(
                  formatVitals({ ...parsed.parts, [part.key]: event.target.value }, parsed.note),
                )
              }
            />
          </Field>
        ))}
      </div>
      <Field
        label="Sinh hiệu"
        hint="Nội dung này được lưu vào bệnh án. Đo trước khi bác sĩ hoàn tất khám."
      >
        <TextArea
          maxLength={1000}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </div>
  );
}
