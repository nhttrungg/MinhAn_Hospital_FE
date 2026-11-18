"use client";
import { z } from "zod";
import {
  EntityForm,
  FormSection,
  FormText,
  DepartmentField,
  DoctorProfileFields,
  StaffRoleField,
  useEntityForm,
  requiredText,
  type EntityFormProps,
} from "./catalog-form-parts";
const schema = z
  .object({
    username: z.string(),
    password: z.string(),
    employeeCode: z.string(),
    fullName: requiredText,
    email: z.email("Email chưa đúng định dạng."),
    phone: z.string().max(30),
    title: requiredText,
    departmentId: z.number().positive("Chọn khoa."),
    role: requiredText,
    specialtyId: z.number(),
    bio: z.string().max(1000),
    photoUrl: z.string(),
    gender: z.enum(["", "MALE", "FEMALE", "OTHER"]),
    serviceIds: z.array(z.number()),
    active: z.boolean(),
  })
  .superRefine((v, c) => {
    if (v.role === "DOCTOR") {
      if (!v.specialtyId)
        c.addIssue({ code: "custom", path: ["specialtyId"], message: "Chọn chuyên khoa." });
      if (!v.serviceIds.length)
        c.addIssue({ code: "custom", path: ["serviceIds"], message: "Chọn dịch vụ khám." });
    }
  });
export function StaffForm({ row, busy, onSave }: EntityFormProps) {
  const form = useEntityForm(schema, {
    username: row?.username ?? "",
    password: "",
    employeeCode: row?.employeeCode ?? "",
    fullName: row?.fullName ?? "",
    email: row?.email ?? "",
    phone: row?.phone ?? "",
    title: row?.title ?? "",
    departmentId: row?.departmentId ?? 0,
    role: row?.roles?.[0] ?? "NURSE",
    specialtyId: row?.specialtyId ?? 0,
    bio: row?.bio ?? "",
    photoUrl: row?.photoUrl ?? "",
    gender: (row?.gender ?? "") as "" | "MALE" | "FEMALE" | "OTHER",
    serviceIds: row?.serviceIds ?? [],
    active: row?.active ?? true,
  });
  const doctor = form.watch("role") === "DOCTOR";
  return (
    <EntityForm
      form={form}
      busy={busy}
      editing={!!row}
      onSave={async (values) => {
        if (!row) {
          let invalid = false;
          for (const key of ["username", "password", "employeeCode"] as const) {
            const value = String(values[key] ?? "");
            if (!value || (key === "password" && value.length < 8)) {
              form.setError(key, {
                message:
                  key === "password" ? "Mật khẩu ít nhất 8 ký tự." : "Vui lòng nhập thông tin.",
              });
              invalid = true;
            }
          }
          if (invalid) return;
        }
        await onSave(values);
      }}
    >
      <FormSection title="Thông tin cá nhân">
        <FormText name="fullName" label="Họ tên" required />
        <FormText name="email" label="Email" type="email" required />
        <FormText
          name="phone"
          label="Điện thoại"
          type="tel"
          hint="Không bắt buộc. Ví dụ: 0901234567."
        />
      </FormSection>
      <FormSection title="Thông tin công việc">
        <DepartmentField />
        <FormText name="title" label="Chức danh" required />
        <StaffRoleField />
        {!row && (
          <FormText
            name="employeeCode"
            label="Mã nhân viên"
            required
            hint="Mã nội bộ, không thể đổi sau khi tạo."
          />
        )}
      </FormSection>
      {!row && (
        <FormSection title="Tài khoản đăng nhập">
          <FormText
            name="username"
            label="Tên đăng nhập"
            required
            hint="Dùng để đăng nhập, không thể đổi sau khi tạo."
          />
          <FormText
            name="password"
            label="Mật khẩu ban đầu"
            type="password"
            required
            hint="Ít nhất 8 ký tự."
          />
        </FormSection>
      )}
      {doctor && <DoctorProfileFields />}
    </EntityForm>
  );
}
