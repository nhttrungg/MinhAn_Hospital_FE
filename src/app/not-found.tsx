import { StatusScreen } from "@/components/layout/status-screen";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn bạn mở không tồn tại hoặc đã được chuyển. Hãy kiểm tra lại địa chỉ hoặc quay về trang chủ."
    />
  );
}
