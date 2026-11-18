import { Suspense } from "react";
import { LoginForm } from "@/components/customer/login-form";
import { AuthLayout } from "@/components/layout/auth-layout";
export const metadata = { title: "Đăng nhập nhân viên" };
export default function Page() {
  return (
    <AuthLayout
      staff
      title="Chào mừng trở lại"
      description="Đăng nhập tài khoản được cấp để bắt đầu phiên làm việc."
    >
      <Suspense>
        <LoginForm staff />
      </Suspense>
    </AuthLayout>
  );
}
