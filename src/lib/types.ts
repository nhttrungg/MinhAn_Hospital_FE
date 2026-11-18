export type PageResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CurrentUser = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  userType: "STAFF" | "PATIENT";
  roles: string[];
};

export type Department = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
};

export type Room = {
  description?: string | null;
  id: number;
  departmentId: number;
  departmentName: string;
  code: string;
  name: string;
  roomType: string;
  active: boolean;
  createdAt: string;
};

export type Bed = {
  id: number;
  roomId: number;
  roomCode: string;
  roomName: string;
  departmentId: number;
  departmentName: string;
  code: string;
  status: string;
  active: boolean;
  createdAt: string;
};

export type ClinicalService = {
  description?: string | null;
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  unitPrice: string | null;
  effectiveFrom: string | null;
  createdAt: string;
};

export type StaffAccount = {
  photoUrl?: string | null;
  specialtyId: number | null;
  bio: string | null;
  serviceIds: number[];
  id: number;
  userId: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  employeeCode: string;
  departmentId: number;
  departmentName: string | null;
  title: string;
  accountStatus: string;
  active: boolean;
  createdAt: string;
};

export type RoleOption = {
  code: string;
  name: string;
};

export type DashboardSummary = {
  departments: number;
  rooms: number;
  beds: number;
  bedsAvailable: number;
  services: number;
  staff: number;
};

export type Specialty = { id: number; code: string; name: string; description: string | null };
export type Doctor = {
  photoUrl?: string | null;
  serviceDescription?: string | null;
  id: number;
  fullName: string;
  title: string;
  specialtyId: number;
  specialtyName: string;
  bio: string | null;
  serviceId: number;
  serviceName: string;
  price: string | null;
};
export type Slot = {
  id: number;
  doctorId: number;
  doctorName: string;
  roomId: number;
  roomName: string;
  serviceId: number;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  available: boolean;
  price: string | null;
  rejectionReason: string | null;
  note: string | null;
};
export type Appointment = {
  id: number;
  code: string;
  patientId: number;
  patientName: string;
  slot: Slot;
  status: string;
  symptoms: string | null;
  queueNumber: number | null;
  bookedPrice: string;
  checkedInAt: string | null;
  revision: number;
};
export type Patient = {
  id: number;
  code: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  active: boolean;
};
