"use client";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { AlertCircle, ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { apiErrorPresentation } from "@/lib/api-error-presentation";
import { vietnamDate } from "@/lib/outpatient";
import {
  EmptyCalendarIllustration,
  EmptyRecordsIllustration,
  EmptySearchIllustration,
} from "./medical-illustrations";
import { Button, ButtonLink } from "./primitives";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  backHref,
  backLabel = "Quay lại",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="at-page-header">
      <div>
        {backHref && (
          <ButtonLink
            href={backHref}
            variant="text"
            size="sm"
            appearance="custom"
            className="at-back-link"
          >
            <ArrowLeft size={15} aria-hidden /> {backLabel}
          </ButtonLink>
        )}
        {eyebrow && <p className="at-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {meta && <div className="at-page-meta">{meta}</div>}
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="at-page-actions">{actions}</div>}
    </div>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu",
  description = "Dữ liệu sẽ xuất hiện tại đây khi có thông tin mới.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const normalized = title.toLocaleLowerCase("vi-VN");
  const Illustration = /tìm|phù hợp/.test(normalized)
    ? EmptySearchIllustration
    : /lịch|giờ|hẹn|chờ/.test(normalized)
      ? EmptyCalendarIllustration
      : EmptyRecordsIllustration;
  return (
    <div className="at-empty">
      <span className="at-empty-illustration" aria-hidden="true">
        <Illustration />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="at-skeleton" role="status" aria-label="Đang tải dữ liệu">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  const presentation = apiErrorPresentation(error);
  return (
    <div className="at-error" role="alert">
      <AlertCircle size={24} />
      <div>
        <h3>{presentation.title}</h3>
        <p>{presentation.message}</p>
        {retry && presentation.retryable && (
          <Button variant="ghost" onClick={retry}>
            Thử lại
          </Button>
        )}
      </div>
    </div>
  );
}
export function FilterBar({
  children,
  onClear,
  appearance = "default",
  className = "",
  label = "Bộ lọc",
}: {
  children: ReactNode;
  onClear?: () => void;
  appearance?: "default" | "custom";
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={appearance === "custom" ? className : `at-filter-bar ${className}`}
      role="search"
      aria-label={label}
      data-ui="filters"
    >
      {children}
      {onClear && (
        <Button variant="ghost" onClick={onClear}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

export function InlineStatus({
  as: Element = "p",
  tone = "info",
  ...props
}: ComponentProps<"p"> & {
  as?: "p" | "div" | "span";
  tone?: "info" | "error";
}) {
  return <Element {...props} role={tone === "error" ? "alert" : "status"} data-ui="status" />;
}
export function CompactText({ text }: { text?: string | null }) {
  const compact = text?.replace(/\s+/g, " ").trim();
  return (
    <span className="at-cell-summary">
      {compact ? (compact.length > 110 ? `${compact.slice(0, 110).trimEnd()}…` : compact) : "—"}
    </span>
  );
}
export function DataTable<T extends object>({
  data,
  columns,
  onRow,
  empty,
  selected,
  className = "",
  fitColumns = false,
  caption,
  rowLabel,
  busy = false,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  onRow?: (row: T) => void;
  empty?: ReactNode;
  selected?: number;
  className?: string;
  fitColumns?: boolean;
  /** Accessible table name, announced by screen readers (not shown). */
  caption?: string;
  /** Accessible name for each clickable row, e.g. "Mở hồ sơ Nguyễn Văn A". */
  rowLabel?: (row: T) => string;
  /** Dims the table while data is being refetched in the background. */
  busy?: boolean;
}) {
  "use no memo"; // TanStack Table returns mutable callbacks; keep this component outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library -- This component explicitly opts out of compiler memoization.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });
  const totalWidth = table
    .getVisibleLeafColumns()
    .reduce((total, column) => total + column.getSize(), 0);
  if (!data.length) return empty || <EmptyState />;
  function activate(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRow?.(row);
    }
  }
  return (
    <div className={`at-table-wrap ${className}`} aria-busy={busy || undefined} data-busy={busy}>
      <table className="at-table" data-ui="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((h) => (
                <th
                  scope="col"
                  key={h.id}
                  data-column={h.column.id}
                  style={
                    fitColumns
                      ? { width: `${(h.getSize() / totalWidth) * 100}%` }
                      : h.column.columnDef.size
                        ? { width: h.column.columnDef.size }
                        : undefined
                  }
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              data-selected={
                selected !== undefined && "id" in row.original && row.original.id === selected
              }
              data-clickable={onRow ? true : undefined}
              tabIndex={onRow ? 0 : undefined}
              aria-label={onRow && rowLabel ? rowLabel(row.original) : undefined}
              onClick={onRow ? () => onRow(row.original) : undefined}
              onKeyDown={onRow ? (event) => activate(event, row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  data-column={cell.column.id}
                  data-label={
                    typeof cell.column.columnDef.header === "string"
                      ? cell.column.columnDef.header
                      : undefined
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "neutral",
  loading = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
}) {
  return (
    <div className="at-stat" data-tone={tone} aria-busy={loading || undefined}>
      {Icon && (
        <span className="at-stat-icon" aria-hidden>
          <Icon size={20} />
        </span>
      )}
      <p>{label}</p>
      {loading ? (
        <span className="at-stat-loading" role="status" aria-label="Đang tải số liệu" />
      ) : (
        <strong>{value}</strong>
      )}
      {hint && <small>{hint}</small>}
      {href && (
        <ButtonLink variant="ghost" href={href}>
          Xem chi tiết <ArrowRight size={14} />
        </ButtonLink>
      )}
    </div>
  );
}
/**
 * Single-choice quick filter (e.g. invoice status). Renders a labelled button group with
 * `aria-pressed`, an optional count per option and keyboard-friendly focus order.
 */
export function SegmentedFilter({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="at-segmented no-print" role="group" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option.value || option.label}
          appearance="custom"
          className="at-segmented-option"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className="at-segmented-count">{option.count}</span>}
        </Button>
      ))}
    </div>
  );
}
/** Quick date-range presets (today, 7 days, 30 days, this month) in Vietnam time. */
export function DateRangeShortcuts({
  from,
  to,
  onChange,
  presets = ["today", "week", "month30", "thisMonth"],
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  presets?: ("today" | "tomorrow" | "week" | "month30" | "thisMonth")[];
}) {
  const today = vietnamDate();
  const ranges: Record<string, { label: string; from: string; to: string }> = {
    today: { label: "Hôm nay", from: today, to: today },
    tomorrow: { label: "Ngày mai", from: vietnamDate(1), to: vietnamDate(1) },
    week: { label: "7 ngày qua", from: vietnamDate(-6), to: today },
    month30: { label: "30 ngày qua", from: vietnamDate(-29), to: today },
    thisMonth: { label: "Tháng này", from: `${today.slice(0, 8)}01`, to: today },
  };
  return (
    <div
      className="at-segmented at-date-shortcuts no-print"
      role="group"
      aria-label="Khoảng ngày nhanh"
    >
      {presets.map((key) => {
        const range = ranges[key];
        return (
          <Button
            key={key}
            appearance="custom"
            className="at-segmented-option"
            aria-pressed={from === range.from && to === range.to}
            onClick={() => onChange({ from: range.from, to: range.to })}
          >
            {range.label}
          </Button>
        );
      })}
    </div>
  );
}
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="at-detail-list">
      {items.map((i) => (
        <div key={i.label}>
          <dt>{i.label}</dt>
          <dd>{i.value ?? "Chưa có thông tin"}</dd>
        </div>
      ))}
    </dl>
  );
}
