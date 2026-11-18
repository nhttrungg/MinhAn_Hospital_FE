import { Suspense } from "react";
import { LoginForm } from "@/components/customer/login-form";
import { AuthLayout } from "@/components/layout/auth-layout";
export const metadata = { title: "Đăng nhập" };
export default function LoginPage() {
  return (
    <AuthLayout
      title="Chào bạn, thật vui được gặp lại"
      description="Đăng nhập để đặt lịch và theo dõi kết quả khám của bạn."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
