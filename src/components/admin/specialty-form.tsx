"use client";
import { z } from "zod";
import {
  EntityForm,
  FormSection,
  FormText,
  DepartmentField,
  useEntityForm,
  requiredCode,
  requiredText,
  type EntityFormProps,
} from "./catalog-form-parts";
const schema = z.object({
  code: requiredCode,
  name: requiredText,
  departmentId: z.number().positive("Chọn khoa."),
  description: z.string().max(1000),
  active: z.boolean(),
});
export function SpecialtyForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    departmentId: row?.departmentId ?? 0,
    active: row?.active ?? true,
  });
  return (
    <EntityForm form={form} busy={busy} onSave={onSave} editing={!!row}>
      <FormSection title="Thông tin chuyên khoa">
        <FormText
          name="code"
          label="Mã chuyên khoa"
          required
          hint="2–30 ký tự: chữ, số hoặc dấu gạch nối."
        />
        <FormText name="name" label="Tên chuyên khoa" required />
        <DepartmentField />
        <div className="sm:col-span-2">
          <FormText name="description" label="Mô tả" area />
        </div>
      </FormSection>
    </EntityForm>
  );
}
