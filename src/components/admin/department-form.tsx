"use client";
import { z } from "zod";
import {
  EntityForm,
  FormSection,
  FormText,
  useEntityForm,
  requiredCode,
  requiredText,
  type EntityFormProps,
} from "./catalog-form-parts";
const schema = z.object({
  code: requiredCode,
  name: requiredText,
  description: z.string().max(500, "Tối đa 500 ký tự."),
  active: z.boolean(),
});
export function DepartmentForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    active: row?.active ?? true,
  });
  return (
    <EntityForm form={form} busy={busy} onSave={onSave} editing={!!row}>
      <FormSection title="Thông tin khoa">
        <FormText
          name="code"
          label="Mã khoa"
          required
          readOnly={!!row}
          hint={row ? "Mã không thể đổi sau khi tạo." : "2–30 ký tự: chữ, số hoặc dấu gạch nối."}
        />
        <FormText name="name" label="Tên khoa" required />
        <div className="sm:col-span-2">
          <FormText
            name="description"
            label="Mô tả"
            area
            hint="Thông tin chi tiết chỉ hiển thị khi mở hồ sơ khoa."
          />
        </div>
      </FormSection>
    </EntityForm>
  );
}
