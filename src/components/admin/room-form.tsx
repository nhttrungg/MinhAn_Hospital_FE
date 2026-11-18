"use client";
import { z } from "zod";
import {
  EntityForm,
  FormSection,
  FormText,
  FormSelect,
  DepartmentField,
  useEntityForm,
  requiredCode,
  requiredText,
  type EntityFormProps,
} from "./catalog-form-parts";
const schema = z.object({
  code: requiredCode,
  name: requiredText,
  description: z.string().max(1000, "Tối đa 1.000 ký tự."),
  departmentId: z.number().positive("Chọn khoa."),
  roomType: requiredText,
  active: z.boolean(),
});
export function RoomForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    departmentId: row?.departmentId ?? 0,
    roomType: row?.roomType ?? "CLINIC",
    active: row?.active ?? true,
  });
  return (
    <EntityForm form={form} busy={busy} onSave={onSave} editing={!!row}>
      <FormSection title="Thông tin phòng">
        <FormText
          name="code"
          label="Mã phòng"
          required
          readOnly={!!row}
          hint={row ? "Mã không thể đổi sau khi tạo." : "2–30 ký tự: chữ, số hoặc dấu gạch nối."}
        />
        <FormText name="name" label="Tên phòng" required />
        <DepartmentField />
        <FormSelect
          name="roomType"
          label="Loại phòng"
          options={[
            { value: "CLINIC", label: "Phòng khám" },
            { value: "WARD", label: "Nội trú" },
            { value: "LAB", label: "Xét nghiệm" },
            { value: "PHARMACY", label: "Dược" },
            { value: "CASHIER", label: "Thu ngân" },
            { value: "ADMIN", label: "Hành chính" },
          ]}
        />
        <div className="sm:col-span-2">
          <FormText
            name="description"
            label="Mô tả chi tiết"
            area
            hint="Phạm vi sử dụng phòng, hướng dẫn tiếp nhận. Tối đa 1.000 ký tự."
          />
        </div>
      </FormSection>
    </EntityForm>
  );
}
