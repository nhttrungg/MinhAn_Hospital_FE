import { ApiError } from "./api";
export function apiErrorPresentation(error: Error) {
  if (!(error instanceof ApiError))
    return { title: "Không tải được thông tin", message: error.message, retryable: true };
  const messages: Record<number, { title: string; guidance: string }> = {
    0: {
      title: "Chưa kết nối được máy chủ",
      guidance:
        "Kiểm tra kết nối mạng rồi thử lại. Thông tin đang nhập vẫn được giữ trên màn hình.",
    },
    401: {
      title: "Phiên đăng nhập đã hết hạn",
      guidance: "Đăng nhập lại để tiếp tục. Nếu có bản nháp, mở lại hồ sơ để khôi phục.",
    },
    403: {
      title: "Bạn không có quyền thực hiện",
      guidance: "Chọn chức năng thuộc vai trò của bạn hoặc liên hệ quản trị viên.",
    },
    409: {
      title: "Thông tin vừa thay đổi",
      guidance:
        "Tải lại dữ liệu, kiểm tra trạng thái mới rồi thực hiện lại. Không gửi lặp thao tác thanh toán.",
    },
    429: { title: "Có quá nhiều yêu cầu", guidance: "Chờ một lát rồi thử lại." },
  };
  const explanation = messages[error.status];
  return {
    title: explanation?.title ?? error.title,
    message: [error.message, explanation?.guidance].filter(Boolean).join(" "),
    retryable: ![401, 403].includes(error.status),
  };
}
