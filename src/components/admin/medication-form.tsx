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
  ingredient: requiredText,
  strength: requiredText.max(100),
  form: requiredText.max(100),
  unit: requiredText.max(50),
  reorderLevel: z.coerce.number().int().min(0).max(100000000),
  active: z.boolean(),
});
export function MedicationForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    code: row?.code ?? "",
    name: row?.name ?? "",
    ingredient: row?.ingredient ?? "",
    strength: row?.strength ?? "",
    form: row?.form ?? "",
    unit: row?.unit ?? "",
    reorderLevel: row && "reorderLevel" in row ? Number(row.reorderLevel) : 0,
    active: row?.active ?? true,
  });
  return (
    <EntityForm form={form} busy={busy} onSave={onSave} editing={!!row}>
      <FormSection title="Tên và thành phần">
        <FormText
          name="code"
          label="Mã thuốc"
          required
          hint="2–30 ký tự: chữ, số hoặc dấu gạch nối."
        />
        <FormText name="name" label="Tên thuốc" required />
        <FormText name="ingredient" label="Hoạt chất" required />
      </FormSection>
      <FormSection title="Dạng thuốc và đơn vị">
        <FormText name="strength" label="Hàm lượng" required hint="Ví dụ: 500 mg" />
        <FormText name="form" label="Dạng thuốc" required hint="Ví dụ: viên, dung dịch" />
        <FormText name="unit" label="Đơn vị" required hint="Đơn vị dùng khi kê số lượng." />
        <FormText
          name="reorderLevel"
          label="Mức tồn tối thiểu"
          type="number"
          required
          hint="0 để tắt cảnh báo. Áp dụng riêng cho từng quầy."
        />
      </FormSection>
    </EntityForm>
  );
}
