export type CatalogKind =
  "departments" | "rooms" | "services" | "specialties" | "medications" | "accounts";
export const doctorPhotoOptions = [
  { value: "", label: "Dùng chữ viết tắt" },
  ...Array.from({ length: 56 }, (_, index) => {
    const number = index + 1;
    const gender = number <= 2 || Math.floor((number - 3) / 3) % 2 === 0 ? "nam" : "nữ";
    return {
      value: `/images/doctors/doctor-asian-${String(number).padStart(3, "0")}.jpg`,
      label: `Chân dung châu Á ${gender} · ${String(number).padStart(3, "0")}`,
    };
  }),
];
export function doctorPhotoOptionsFor(currentPhoto?: string | null) {
  if (!currentPhoto || doctorPhotoOptions.some((option) => option.value === currentPhoto))
    return doctorPhotoOptions;
  return [{ value: currentPhoto, label: "Ảnh hiện đang dùng · tùy chỉnh" }, ...doctorPhotoOptions];
}
export type CatalogRow = {
  id: number;
  active: boolean;
  code?: string;
  name?: string;
  description?: string | null;
  departmentId?: number;
  departmentName?: string;
  roomType?: string;
  category?: string;
  unit?: string;
  unitPrice?: string | null;
  effectiveFrom?: string | null;
  ingredient?: string;
  strength?: string;
  form?: string;
  employeeCode?: string;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  title?: string;
  roles?: string[];
  specialtyId?: number | null;
  bio?: string | null;
  photoUrl?: string | null;
  gender?: string | null;
  serviceIds?: number[];
};
export type CatalogInput = {
  active: boolean;
  code?: string;
  name?: string;
  description?: string;
  departmentId?: number;
  roomType?: string;
  category?: string;
  unit?: string;
  unitPrice?: string;
  ingredient?: string;
  strength?: string;
  form?: string;
  username?: string;
  password?: string;
  employeeCode?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  role?: string;
  specialtyId?: number;
  bio?: string;
  photoUrl?: string;
  gender?: string;
  serviceIds?: number[];
};
export const catalogNames: Record<CatalogKind, string> = {
  departments: "Khoa",
  rooms: "Phòng",
  services: "Dịch vụ và giá",
  specialties: "Chuyên khoa",
  medications: "Thuốc kê đơn",
  accounts: "Nhân viên và bác sĩ",
};
