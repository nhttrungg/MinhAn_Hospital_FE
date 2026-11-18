"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Diagnosis } from "@/lib/clinical-safety";
import { Button, Field, TextInput, SelectInput, Notice } from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";

type Code = { code: string; nameVi: string; nameEn: string; sourceSystem: string; demo: boolean };
export function Icd10Picker({
  value,
  onChange,
}: {
  value: Diagnosis[];
  onChange: (value: Diagnosis[]) => void;
}) {
  const [q, setQ] = useState("");
  const search = useQuery({
    queryKey: ["icd10", q],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Code[]>(`/api/v1/catalog/icd10?q=${encodeURIComponent(q)}`, { signal }),
  });
  return (
    <div className="space-y-3">
      <Notice tone="warning">
        Danh mục ICD-10-CM demo; bản dịch tham khảo. Không dùng cho điều trị hoặc mã hóa hồ sơ thật.
      </Notice>
      <Field label="Tìm mã hoặc tên chẩn đoán">
        <TextInput
          value={q}
          maxLength={100}
          placeholder="J06 hoặc viem hong"
          onChange={(e) => setQ(e.target.value)}
        />
      </Field>
      <QueryState
        loading={search.isLoading}
        error={search.error}
        retry={() => void search.refetch()}
      />
      <Field label="Thêm chẩn đoán">
        <SelectInput
          value=""
          disabled={value.length >= 20 || search.isLoading || !!search.error}
          onChange={(e) => {
            const code = search.data?.find((c) => c.code === e.target.value);
            if (code && !value.some((d) => d.code === code.code))
              onChange([...value, { ...code, primary: value.length === 0 }]);
          }}
        >
          <option value="">Chọn mã trong kết quả tìm kiếm</option>
          {search.data
            ?.filter((c) => !value.some((d) => d.code === c.code))
            .map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.nameVi}
              </option>
            ))}
        </SelectInput>
      </Field>
      {!search.isLoading && search.data?.length === 0 && (
        <p className="text-sm text-muted">Không tìm thấy mã.</p>
      )}
      {value.map((d) => (
        <div key={d.code} className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            {d.code} · {d.nameVi}
          </span>
          <Button
            type="button"
            variant="ghost"
            aria-pressed={d.primary}
            onClick={() => onChange(value.map((c) => ({ ...c, primary: c.code === d.code })))}
          >
            {d.primary ? "Chẩn đoán chính" : "Đặt làm chính"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              const rest = value.filter((c) => c.code !== d.code);
              onChange(rest.map((c, i) => ({ ...c, primary: d.primary ? i === 0 : c.primary })));
            }}
          >
            Bỏ {d.code}
          </Button>
        </div>
      ))}
    </div>
  );
}
