"use client";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Check, ChevronsUpDown, CalendarDays } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import { SearchInput, Button } from "./primitives";
import "react-day-picker/style.css";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Chọn…",
  disabled,
  "aria-describedby": described,
  "aria-invalid": invalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    `${o.label} ${o.description ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        q
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      ),
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        className="at-control at-combobox"
        role="combobox"
        aria-expanded={open}
        aria-describedby={described}
        aria-invalid={invalid}
        disabled={disabled}
      >
        <span className={selected ? "" : "text-muted"}>{selected?.label || placeholder}</span>
        <ChevronsUpDown size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="at-combobox-menu" sideOffset={5} align="start">
          <SearchInput
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tìm trong danh sách"
            placeholder="Nhập để tìm kiếm"
          />
          <div role="listbox" className="at-option-list">
            {filtered.map((o) => (
              <Button
                appearance="custom"
                type="button"
                role="option"
                aria-selected={value === o.value}
                disabled={o.disabled}
                className="at-option"
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
              >
                <div>
                  <span>{o.label}</span>
                  {o.description && <small>{o.description}</small>}
                </div>
                {value === o.value && <Check size={17} />}
              </Button>
            ))}
            {!filtered.length && (
              <p className="p-3 text-sm text-muted">Không có lựa chọn phù hợp.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
function toDate(value: string) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}
function dateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function DatePicker({
  id,
  value,
  onChange,
  min,
  label = "Chọn ngày",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger id={id} className="at-control at-combobox" aria-label={label}>
        <span>{value ? toDate(value)?.toLocaleDateString("vi-VN") : label}</span>
        <CalendarDays size={18} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="at-calendar" sideOffset={6}>
          <DayPicker
            mode="single"
            locale={vi}
            selected={toDate(value)}
            defaultMonth={toDate(value)}
            disabled={min ? { before: toDate(min)! } : undefined}
            onSelect={(day) => {
              if (day) {
                onChange(dateString(day));
                setOpen(false);
              }
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function MultiDatePicker({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <DayPicker
      mode="multiple"
      locale={vi}
      selected={values.map((v) => toDate(v)!)}
      onSelect={(days) => onChange((days ?? []).map(dateString))}
    />
  );
}
