import { api, ApiError } from "./api";
export type Row = Record<string, unknown>;
export const value = (row: Row | null | undefined, key: string) => String(row?.[key] ?? "");
export const number = (row: Row | null | undefined, key: string) => Number(row?.[key] ?? 0);
export const rows = (row: Row | null | undefined, key: string) =>
  (Array.isArray(row?.[key]) ? row[key] : []) as Row[];
export const labels: Record<string, string> = {
  DRAFT: "Nháp",
  READY: "Chờ thu / giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  OPEN: "Đang xử lý",
  CLOSED: "Đã đóng",
  ISSUED: "Đã chỉ định",
  ACCEPTED: "Đã tiếp nhận",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn tất",
  SUBMITTED: "Chờ duyệt",
  PUBLISHED: "Đã công bố",
  COLLECTED: "Mẫu hợp lệ",
  REJECTED: "Mẫu bị từ chối",
  PAID: "Đã thu đủ",
  PARTIAL: "Thu một phần",
  VOID: "Đã hủy",
};
export function mutate<T = Row>(
  path: string,
  body: unknown = {},
  method = "POST",
  key = crypto.randomUUID(),
) {
  return api<T>(path, { method, headers: { "Idempotency-Key": key }, body: JSON.stringify(body) });
}
export async function binary(path: string): Promise<Blob> {
  const response = await fetch(path, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    let detail = "Không tải được tài liệu.";
    try {
      detail = (await response.json()).detail ?? detail;
    } catch {}
    if (response.status === 401) window.dispatchEvent(new Event("antam-session-expired"));
    throw new ApiError(response.status, "Không tải được", detail);
  }
  return response.blob();
}
