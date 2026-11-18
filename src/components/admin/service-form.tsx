"use client";
import { z } from "zod";
import {
  EntityForm,
  FormSection,
  FormText,
  FormSelect,
  useEntityForm,
  requiredCode,
  requiredText,
  type EntityFormProps,
} from "./catalog-form-parts";
const schema = z.object({
  code: requiredCode,
  name: requiredText,
  description: z.string().max(1500, "Tối đa 1.500 ký tự."),
  category: requiredText,
  unit: requiredText.max(50),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Nhập số tiền hợp lệ."),
  active: z.boolean(),
});
export function ServiceForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "EXAMINATION",
    unit: row?.unit ?? "Lượt",
    unitPrice: row?.unitPrice ?? "0",
    active: row?.active ?? true,
  });
  return (
    <EntityForm form={form} busy={busy} onSave={onSave} editing={!!row}>
      <FormSection title="Thông tin dịch vụ">
        <FormText
          name="code"
          label="Mã dịch vụ"
          required
          readOnly={!!row}
          hint={row ? "Mã không thể đổi sau khi tạo." : "2–30 ký tự: chữ, số hoặc dấu gạch nối."}
        />
        <FormText name="name" label="Tên dịch vụ" required />
        <FormSelect
          name="category"
          label="Nhóm dịch vụ"
          options={[
            { value: "EXAMINATION", label: "Khám bệnh" },
            { value: "LAB", label: "Xét nghiệm" },
            { value: "IMAGING", label: "Chẩn đoán hình ảnh" },
            { value: "BED", label: "Giường" },
            { value: "PROCEDURE", label: "Thủ thuật" },
            { value: "OTHER", label: "Khác" },
          ]}
        />
        <FormText name="unit" label="Đơn vị" required />
        <div className="sm:col-span-2">
          <FormText
            name="description"
            label="Mô tả chi tiết"
            area
            hint="Nội dung lượt khám, phần bao gồm và không bao gồm trong phí. Tối đa 1.500 ký tự."
          />
        </div>
      </FormSection>
      {!row && (
        <FormSection title="Giá khám ban đầu">
          <FormText
            name="unitPrice"
            label="Đơn giá VND"
            required
            hint="Giá được ghi nhận tại thời điểm đặt khám."
          />
        </FormSection>
      )}
    </EntityForm>
  );
}
