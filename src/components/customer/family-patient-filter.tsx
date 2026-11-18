"use client";
import { Field, SelectInput } from "@/components/ui/primitives";
import { QueryState } from "@/components/workspace-ui";
import { useFamilyPatients } from "@/hooks/use-family-patients";

export function FamilyPatientFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (id: number) => void;
}) {
  const { self, family } = useFamilyPatients();
  return (
    <div>
      <Field label="Người khám">
        <SelectInput value={value} onChange={(e) => onChange(Number(e.target.value))}>
          <option value={0}>Tôi và người thân</option>
          {self.data && <option value={self.data.id}>{self.data.fullName} (Tôi)</option>}
          {family.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} · {p.relationship}
            </option>
          ))}
        </SelectInput>
      </Field>
      <QueryState
        loading={self.isLoading || family.isLoading}
        error={self.error || family.error}
        retry={() => {
          void self.refetch();
          void family.refetch();
        }}
      />
    </div>
  );
}
