import {
  Activity,
  Apple,
  Baby,
  Bone,
  Brain,
  Droplets,
  Ear,
  Eye,
  HeartHandshake,
  HeartPulse,
  Microscope,
  Pill,
  Scissors,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  UserCheck,
  Wind,
} from "lucide-react";
import type { ReactNode } from "react";

export function SpecialtyIcon({ name, size = 26 }: { name: string; size?: number }): ReactNode {
  const normalized = name.toLocaleLowerCase("vi-VN");

  if (/răng|hàm|nha/.test(normalized)) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 3C4.8 3 3 4.8 3 7.2c0 2.3.9 4.1 1.6 6.2.6 1.8.9 4.1 1.6 6.1.3.9 1.4 1 1.9.2l1.4-2.8c.5-1 1.3-1.4 2.5-1.4s2 .4 2.5 1.4l1.4 2.8c.5.8 1.6.7 1.9-.2.7-2 1-4.3 1.6-6.1.7-2.1 1.6-3.9 1.6-6.2C21 4.8 19.2 3 17 3c-1.8 0-3.1.9-5 .9S8.8 3 7 3Z" />
      </svg>
    );
  }
  if (/hô hấp|phổi/.test(normalized)) {
    return <Wind size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/tiêu hóa|gan|mật|dạ dày/.test(normalized)) {
    return <Activity size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/nội tiết|đái tháo đường|tiểu đường/.test(normalized)) {
    return <Pill size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/thận|tiết niệu/.test(normalized)) {
    return <Droplets size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/da liễu|thẩm mỹ/.test(normalized)) {
    return <Sparkles size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/tai|mũi|họng/.test(normalized)) {
    return <Ear size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/mắt|nhãn/.test(normalized)) {
    return <Eye size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/sản|phụ khoa/.test(normalized)) {
    return <HeartHandshake size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/nhi/.test(normalized)) {
    return <Baby size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/ung bướu|ung thư/.test(normalized)) {
    return <Microscope size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/nam học|nam khoa/.test(normalized)) {
    return <UserCheck size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/chấn thương|chỉnh hình/.test(normalized)) {
    return <ShieldPlus size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/phục hồi chức năng|vật lý/.test(normalized)) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="5" r="2" />
        <path d="m5 11 7-2 7 2" />
        <path d="M12 9v6" />
        <path d="m9 21 3-6 3 6" />
      </svg>
    );
  }
  if (/dinh dưỡng/.test(normalized)) {
    return <Apple size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/tim|mạch/.test(normalized)) {
    return <HeartPulse size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/thần kinh/.test(normalized)) {
    return <Brain size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/xương|khớp/.test(normalized)) {
    return <Bone size={size} strokeWidth={1.75} aria-hidden="true" />;
  }
  if (/ngoại/.test(normalized)) {
    return <Scissors size={size} strokeWidth={1.75} aria-hidden="true" />;
  }

  return <Stethoscope size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export function EmptyCalendarIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="42" cy="42" r="38" fill="#EAF4ED" />
      <rect
        x="20"
        y="24"
        width="44"
        height="40"
        rx="8"
        fill="#FFFFFF"
        stroke="#176B52"
        strokeWidth="2"
      />
      <path d="M20 35H64" stroke="#176B52" strokeWidth="2" />
      <path d="M31 19V27M53 19V27" stroke="#176B52" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="28" y="42" width="8" height="6" rx="2" fill="#C5E7CD" />
      <rect x="40" y="42" width="8" height="6" rx="2" fill="#EAF4ED" />
      <rect x="28" y="52" width="8" height="6" rx="2" fill="#EAF4ED" />
      <circle cx="55" cy="55" r="11" fill="#176B52" />
      <path d="M55 50.5V59.5M50.5 55H59.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyRecordsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="42" cy="42" r="38" fill="#EAF4ED" />
      <rect
        x="24"
        y="18"
        width="36"
        height="48"
        rx="7"
        fill="#FFFFFF"
        stroke="#176B52"
        strokeWidth="2"
      />
      <rect
        x="34"
        y="14"
        width="16"
        height="8"
        rx="3"
        fill="#C5E7CD"
        stroke="#176B52"
        strokeWidth="1.8"
      />
      <path
        d="M32 33H52M32 41H48M32 49H44"
        stroke="#176B52"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="56" cy="56" r="11" fill="#176B52" />
      <path
        d="M52 56L55 59L61 53"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptySearchIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="36" fill="#EAF4ED" />
      <circle cx="37" cy="37" r="14" fill="#FFFFFF" stroke="#176B52" strokeWidth="2.2" />
      <path d="M47 47L57 57" stroke="#176B52" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M37 32V42M32 37H42" stroke="#176B52" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ClinicShieldIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="#EAF4ED" />
      <path
        d="M24 10L35 14.5V23.5C35 31.2 30.3 36.8 24 39C17.7 36.8 13 31.2 13 23.5V14.5L24 10Z"
        fill="#FFFFFF"
        stroke="#176B52"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 19V29M19 24H29" stroke="#176B52" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
