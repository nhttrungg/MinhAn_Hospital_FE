export const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị viên",
  RECEPTIONIST: "Lễ tân",
  DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng",
  LAB_TECH: "Kỹ thuật viên xét nghiệm",
  PHARMACIST: "Dược sĩ",
  CASHIER: "Thu ngân",
  PATIENT: "Bệnh nhân",
};

export const roomTypeLabels: Record<string, string> = {
  CLINIC: "Phòng khám",
  WARD: "Buồng bệnh",
  LAB: "Xét nghiệm",
  PHARMACY: "Nhà thuốc",
  CASHIER: "Thu ngân",
  ADMIN: "Hành chính",
};

export const bedStatusLabels: Record<string, string> = {
  AVAILABLE: "Trống",
  OCCUPIED: "Đang sử dụng",
  MAINTENANCE: "Bảo trì",
};

export const serviceCategoryLabels: Record<string, string> = {
  EXAMINATION: "Khám",
  LAB: "Xét nghiệm",
  IMAGING: "Chẩn đoán hình ảnh",
  BED: "Giường",
  PROCEDURE: "Thủ thuật",
  OTHER: "Khác",
};

export function labelOf(map: Record<string, string>, code: string): string {
  return map[code] ?? code;
}
