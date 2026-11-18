"use client";
import {
  FormProvider,
  useForm,
  useFormContext,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormReturn,
  type DefaultValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { allOptions, api, ApiError } from "@/lib/api";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  Field,
  TextInput,
  TextArea,
  Button,
  Notice,
  PasswordField,
  Form,
  Checkbox,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/selection";
import { DoctorPortrait } from "@/components/customer/doctor-portrait";
import { QueryState } from "@/components/workspace-ui";
import { doctorPhotoOptionsFor } from "@/lib/catalog-types";
import type { CatalogInput, CatalogRow } from "@/lib/catalog-types";
import { PasswordStrength } from "./admin-parts";
export const requiredText = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập thông tin.")
  .max(200, "Tối đa 200 ký tự.");
export const CatalogModalContext = createContext(false);
export const CatalogDirtyContext = createContext<(dirty: boolean) => void>(() => {});
export const requiredCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{2,30}$/, "Mã gồm 2–30 chữ, số hoặc dấu gạch nối.");
export function useEntityForm<T extends FieldValues & { active: boolean }>(
  schema: z.ZodType<T>,
  defaults: DefaultValues<T>,
) {
  return useForm<T>({
    resolver: zodResolver(schema as never) as Resolver<T>,
    defaultValues: defaults,
    mode: "onBlur",
  });
}
export function EntityForm<T extends FieldValues & { active: boolean }>({
  form,
  onSave,
  busy,
  children,
  editing,
}: {
  form: UseFormReturn<T>;
  onSave: (value: CatalogInput) => Promise<void>;
  busy: boolean;
  children: ReactNode;
  editing: boolean;
}) {
  const onDirty = useContext(CatalogDirtyContext);
  const modal = useContext(CatalogModalContext);
  useEffect(
    () =>
      form.subscribe({
        formState: { isDirty: true },
        callback: (state) => onDirty(!!state.isDirty),
      }),
    [form, onDirty],
  );
  return (
    <FormProvider {...form}>
      <Form
        id="catalog-entity-form"
        className="space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSave(values as CatalogInput);
          } catch (e) {
            if (e instanceof ApiError) {
              e.problem.errors?.forEach((f) =>
                form.setError(f.field as Path<T>, { message: f.message }),
              );
            }
            form.setError("root", {
              message: e instanceof Error ? e.message : "Không lưu được dữ liệu.",
            });
          }
        })}
      >
        <p className="at-required-note">
          Trường có dấu <span className="text-danger">*</span> là bắt buộc.
        </p>
        {children}
        {form.formState.errors.root && (
          <Notice tone="error">{form.formState.errors.root.message}</Notice>
        )}
        {!modal && (
          <div className="border-t border-line pt-5">
            <Button busy={busy} type="submit">
              {editing ? "Lưu thay đổi" : "Tạo mới"}
            </Button>
          </div>
        )}
      </Form>
    </FormProvider>
  );
}
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="at-catalog-form-section">
      <h3 className="at-section-title">{title}</h3>
      {description && <p className="text-sm text-muted mb-4">{description}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
export function FormText({
  name,
  label,
  type = "text",
  hint,
  area = false,
  required = false,
  readOnly = false,
}: {
  name: string;
  label: string;
  type?: string;
  hint?: string;
  area?: boolean;
  required?: boolean;
  readOnly?: boolean;
}) {
  const { register, formState, watch } = useFormContext();
  const error = formState.errors[name]?.message as string | undefined;
  const field = (
    <Field
      label={label}
      error={error}
      hint={type === "password" ? undefined : hint}
      required={required}
    >
      {area ? (
        <TextArea rows={4} {...register(name)} />
      ) : type === "password" ? (
        <PasswordField autoComplete="new-password" {...register(name)} />
      ) : (
        <TextInput
          readOnly={readOnly}
          type={type}
          {...register(name)}
          autoComplete={type === "email" ? "email" : undefined}
        />
      )}
    </Field>
  );
  if (type !== "password") return field;
  return (
    <div className="space-y-2">
      {field}
      <PasswordStrength value={String(watch(name) ?? "")} />
    </div>
  );
}
export function FormSelect({
  name,
  label,
  options,
  numeric = false,
  disabled = false,
  required = true,
}: {
  name: string;
  label: string;
  options: { value: string; label: string; description?: string; disabled?: boolean }[];
  numeric?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  const { watch, setValue, formState } = useFormContext();
  return (
    <Field
      label={label}
      error={formState.errors[name]?.message as string | undefined}
      required={required}
    >
      <Combobox
        disabled={disabled}
        value={String(watch(name) ?? "")}
        onChange={(v) =>
          setValue(name, numeric ? Number(v) : v, { shouldDirty: true, shouldValidate: true })
        }
        options={options}
      />
    </Field>
  );
}
export function DepartmentField() {
  const { watch } = useFormContext();
  const selected = watch("departmentId");
  const query = useQuery({
    queryKey: ["departments", "options"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/departments", { signal }),
  });
  return (
    <div>
      <FormSelect
        name="departmentId"
        label="Khoa"
        numeric
        disabled={query.isLoading || !!query.error}
        options={(query.data ?? [])
          .filter((d) => d.active || d.id === selected)
          .map((d) => ({
            value: String(d.id),
            label: d.name ?? "",
            description: d.active ? "Đang hoạt động" : "Đã ngưng",
          }))}
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
    </div>
  );
}
export function DoctorProfileFields() {
  const { watch, setValue } = useFormContext();
  const spec = useQuery({
    queryKey: ["specialties", "admin"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/specialties", { signal }),
  });
  const services = useQuery({
    queryKey: ["services", "exam"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<CatalogRow>("/api/v1/catalog/services?category=EXAMINATION", { signal }),
  });
  const ids: number[] = watch("serviceIds") ?? [];
  return (
    <FormSection
      title="Hồ sơ bác sĩ"
      description="Chọn chuyên khoa và ít nhất một dịch vụ khám đang hoạt động để công khai bác sĩ."
    >
      <FormSelect
        name="specialtyId"
        label="Chuyên khoa"
        numeric
        disabled={spec.isLoading || !!spec.error}
        options={(spec.data ?? [])
          .filter((d) => d.active || d.id === watch("specialtyId"))
          .map((d) => ({ value: String(d.id), label: d.name ?? "" }))}
      />
      <FormSelect
        name="gender"
        label="Giới tính bác sĩ"
        required={false}
        options={[
          { value: "", label: "Chưa cung cấp" },
          { value: "MALE", label: "Nam" },
          { value: "FEMALE", label: "Nữ" },
          { value: "OTHER", label: "Khác" },
        ]}
      />
      <div className="sm:col-span-2">
        <FormText name="bio" label="Giới thiệu bác sĩ" area />
      </div>
      <FormSelect
        name="photoUrl"
        label="Ảnh đại diện"
        options={doctorPhotoOptionsFor(watch("photoUrl"))}
      />
      <DoctorPortrait
        name={watch("fullName") || "Bác sĩ"}
        photoUrl={watch("photoUrl")}
        className="doctor-preview-portrait"
        sizes="128px"
      />
      <div className="sm:col-span-2">
        <QueryState loading={spec.isLoading} error={spec.error} retry={() => void spec.refetch()} />
        <QueryState
          loading={services.isLoading}
          error={services.error}
          retry={() => void services.refetch()}
        />
        <p className="text-sm font-medium mb-2">Dịch vụ bác sĩ thực hiện</p>
        <div className="at-service-selection">
          {services.data
            ?.filter((s) => s.active || ids.includes(s.id))
            .map((s) => (
              <Checkbox
                key={s.id}
                className="at-check"
                checked={ids.includes(s.id)}
                onChange={(e) =>
                  setValue(
                    "serviceIds",
                    e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
                label={
                  <>
                    <span>{s.name}</span>
                  </>
                }
              />
            ))}
        </div>
        {!ids.length && <p className="at-field-error">Chọn ít nhất một dịch vụ khám.</p>}
      </div>
    </FormSection>
  );
}
export function StaffRoleField() {
  const roles = useQuery({
    queryKey: ["staff-roles"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ code: string; name: string }[]>("/api/v1/staff-accounts/roles", { signal }),
  });
  return (
    <div>
      <FormSelect
        name="role"
        label="Vai trò"
        disabled={roles.isLoading || !!roles.error}
        options={(roles.data ?? []).map((r) => ({ value: r.code, label: r.name }))}
      />
      <QueryState
        loading={roles.isLoading}
        error={roles.error}
        retry={() => void roles.refetch()}
      />
    </div>
  );
}
export type EntityFormProps = {
  row: CatalogRow | null;
  busy: boolean;
  onSave: (value: CatalogInput) => Promise<void>;
};
