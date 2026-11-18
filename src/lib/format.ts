const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 2,
});

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

export function formatVnd(amount: string | number | null | undefined): string {
  if (amount == null || (typeof amount === "string" && amount.trim() === "")) {
    return "—";
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return String(amount);
  }
  return vnd.format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateTime.format(date);
}

const dateOnly = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return dateOnly.format(date);
}

export function formatQuantity(value: number | string | null | undefined): string {
  if (value == null || value === "") {
    return "—";
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
