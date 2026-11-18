"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";
import { Button, Field, Notice, TextInput, ButtonLink, Form } from "@/components/ui";
import { PasswordField } from "@/components/ui/primitives";
import { MfaCodeForm } from "./mfa-code-form";

const schema = z.object({
  username: z.string().trim().min(1, "Nhập tên đăng nhập"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

type FormValues = z.infer<typeof schema>;

function destination(next: string | null, user: CurrentUser): string {
  const home =
    user.userType === "PATIENT"
      ? "/portal"
      : user.roles.includes("DOCTOR")
        ? "/staff/queue"
        : "/staff";
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return home;
  }
  if (user.userType === "PATIENT" && next.startsWith("/portal")) {
    return next;
  }
  if (user.userType !== "PATIENT" && next.startsWith("/staff")) {
    return next;
  }
  if (
    next.startsWith("/booking") &&
    (user.userType === "PATIENT" || user.roles.includes("RECEPTIONIST"))
  ) {
    return next;
  }
  return home;
}

export function LoginForm({ staff = false }: { staff?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setNotice(null);
    try {
      const user = await api<CurrentUser | { mfaRequired: true }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.resetField("password");
      if ("mfaRequired" in user) {
        queryClient.clear();
        setMfaRequired(true);
        return;
      }
      complete(user);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Không kết nối được máy chủ.");
    }
  }
  function complete(user: CurrentUser) {
    queryClient.clear();
    queryClient.setQueryData(["me"], user);
    router.push(destination(params.get("next"), user));
    router.refresh();
  }

  if (mfaRequired)
    return (
      <MfaCodeForm
        onSuccess={complete}
        onRestart={() => {
          setMfaRequired(false);
          form.resetField("password");
        }}
      />
    );

  return (
    <Form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {params.get("passwordChanged") && (
        <p className="text-sm text-brand">Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</p>
      )}
      {params.get("expired") && (
        <p className="text-sm text-muted">Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.</p>
      )}
      {notice ? <Notice tone="error">{notice}</Notice> : null}
      <Field label="Tên đăng nhập" error={form.formState.errors.username?.message}>
        <TextInput autoComplete="username" {...form.register("username")} />
      </Field>
      <Field label="Mật khẩu" error={form.formState.errors.password?.message}>
        <PasswordField autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <div className="flex flex-wrap justify-between gap-2">
        <ButtonLink variant="ghost" href={staff ? "/login" : "/register"}>
          {staff ? "Đăng nhập khách hàng" : "Tạo tài khoản"}
        </ButtonLink>
        <ButtonLink variant="ghost" href="/forgot-password">
          Quên mật khẩu?
        </ButtonLink>
      </div>
      {!staff && (
        <p className="text-center text-sm text-muted">
          Bạn là nhân viên?{" "}
          <ButtonLink href="/login/staff" variant="ghost">
            Vào khu nhân viên
          </ButtonLink>
        </p>
      )}
    </Form>
  );
}
