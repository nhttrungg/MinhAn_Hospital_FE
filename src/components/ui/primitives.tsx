"use client";

import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
  type ComponentProps,
  type InputHTMLAttributes,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Search,
} from "lucide-react";

type ActionStyle = {
  variant?: "primary" | "ghost" | "danger" | "light" | "text";
  appearance?: "default" | "public" | "custom";
  size?: "md" | "sm";
  className?: string;
};

function actionClassName({
  variant = "primary",
  appearance = "default",
  size = "md",
  className = "",
}: ActionStyle) {
  if (appearance === "custom") return className;
  if (appearance === "public") {
    const style =
      variant === "text"
        ? "public-text-link"
        : `public-button${variant === "ghost" ? " outline" : variant === "light" ? " light" : ""}`;
    return `${style} ${className}`;
  }
  return `at-button at-button-${variant === "light" || variant === "text" ? "ghost" : variant}${size === "sm" ? " at-button-sm" : ""} ${className}`;
}

export function ButtonLink({
  variant,
  appearance,
  size,
  className,
  download,
  prefetch,
  ...props
}: ComponentProps<typeof Link> & ActionStyle) {
  return (
    <Link
      {...props}
      download={download}
      prefetch={download || appearance === "public" ? false : prefetch}
      className={actionClassName({ variant, appearance, size, className })}
      data-ui="button-link"
    />
  );
}

export function Button({
  variant = "primary",
  appearance = "default",
  size = "md",
  className = "",
  busy = false,
  type = "button",
  children,
  ...props
}: ComponentProps<"button"> &
  ActionStyle & {
    busy?: boolean;
  }) {
  return (
    <button
      {...props}
      type={type}
      className={actionClassName({ variant, appearance, size, className })}
      data-ui="button"
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy && <Loader2 size={size === "sm" ? 15 : 17} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
type ControlStyle = { appearance?: "default" | "custom" };

export function Form({ busy, ...props }: ComponentProps<"form"> & { busy?: boolean }) {
  return <form {...props} aria-busy={busy || props["aria-busy"]} data-ui="form" />;
}

export function Label(props: ComponentProps<"label">) {
  return <label {...props} />;
}

export function Fieldset({
  legend,
  legendClassName,
  children,
  ...props
}: ComponentProps<"fieldset"> & { legend: ReactNode; legendClassName?: string }) {
  return (
    <fieldset {...props}>
      <legend className={legendClassName}>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function TextInput({
  className = "",
  appearance = "default",
  ...props
}: ComponentProps<"input"> & ControlStyle) {
  return (
    <input
      {...props}
      className={appearance === "custom" ? className : `at-control ${className}`}
      data-ui="input"
    />
  );
}
export function TextArea({
  className = "",
  appearance = "default",
  ...props
}: ComponentProps<"textarea"> & ControlStyle) {
  return (
    <textarea
      {...props}
      className={appearance === "custom" ? className : `at-control at-textarea ${className}`}
      data-ui="textarea"
    />
  );
}
export function SelectInput({
  className = "",
  appearance = "default",
  ...props
}: ComponentProps<"select"> & ControlStyle) {
  return (
    <select
      {...props}
      className={appearance === "custom" ? className : `at-control ${className}`}
      data-ui="select"
    />
  );
}
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const generated = useId();
  const child = isValidElement(children)
    ? (children as ReactElement<{
        id?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
      }>)
    : null;
  const id = child?.props.id ?? generated;
  return (
    <div className="at-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {child
        ? cloneElement(child, {
            id,
            "aria-describedby": error || hint ? `${id}-help` : child.props["aria-describedby"],
            "aria-invalid": !!error,
          })
        : children}
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? "at-field-error" : "at-field-hint"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
export function PasswordField(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <div>
      <div className="at-password">
        <TextInput
          {...props}
          type={show ? "text" : "password"}
          onKeyUp={(e) => {
            setCaps(e.getModifierState("CapsLock"));
            props.onKeyUp?.(e);
          }}
        />
        <Button
          appearance="custom"
          type="button"
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>
      {caps && <p className="at-field-hint">Caps Lock đang bật.</p>}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success" | "warning";
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div className={`at-notice at-notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`at-card ${className}`}>
      {children}
    </section>
  );
}
export function StatusBadge({
  children,
  status = "",
  tone: explicitTone,
}: {
  children: ReactNode;
  status?: string;
  tone?: "danger" | "warning" | "success" | "neutral" | "info";
}) {
  const s = status.toUpperCase();
  let tone = explicitTone;
  if (!tone) {
    if (
      /^(UNPAID|CANCEL|CANCELED|CANCELLED|REJECT|REJECTED|FAIL|FAILED|CLOSED|NO_SHOW|INACTIVE|EXPIRED|STOPPED|REVOKED|VOID|OVERDUE)$/.test(
        s,
      ) ||
      /CANCEL|REJECT|FAIL|NO_SHOW/.test(s)
    ) {
      tone = "danger";
    } else if (
      /^(WAIT|WAITING|PARTIAL|PARTIALLY_PAID|DRAFT|SUBMIT|SUBMITTED|CLOSE_REQUEST|NEEDS_RESCHEDULE|NEEDS_ATTENTION|PENDING|MAINTENANCE|OPEN|PREPARING)$/.test(
        s,
      ) ||
      /WAIT|PARTIAL|DRAFT|SUBMIT|PENDING|MAINTENANCE/.test(s)
    ) {
      tone = "warning";
    } else if (
      /^(CHECKED_IN|IN_PROGRESS|PROCESSING|COLLECTED|SAMPLED|ACCEPTED|RECEIVED)$/.test(s)
    ) {
      tone = "info";
    } else if (
      /^(PAID|COMPLETE|COMPLETED|PUBLISH|PUBLISHED|CONFIRM|CONFIRMED|SENT|ACTIVE|AVAILABLE|READY|FINAL|DISPENSED|DELIVERED|APPROVED|REVIEWED|ISSUED|DONE)$/.test(
        s,
      ) ||
      /COMPLETE|PUBLISH|CONFIRM/.test(s)
    ) {
      tone = "success";
    } else {
      tone = "neutral";
    }
  }
  return (
    <span className={`at-badge at-badge-${tone}`}>
      <span aria-hidden />
      {children}
    </span>
  );
}
export function Badge({ active }: { active: boolean }) {
  return (
    <StatusBadge status={active ? "ACTIVE" : "CLOSED"}>
      {active ? "Đang hoạt động" : "Đã ngưng"}
    </StatusBadge>
  );
}
export function Pager({
  page,
  totalPages,
  onPage,
  totalElements,
  size,
  onSize,
  appearance = "default",
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  totalElements?: number;
  size?: number;
  onSize?: (size: number) => void;
  appearance?: "default" | "public";
}) {
  if (appearance === "public") {
    return (
      <div className="public-pagination">
        <Button
          appearance="custom"
          aria-label="Trang trước"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
        >
          Trước
        </Button>
        <span>
          Trang {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button
          appearance="custom"
          aria-label="Trang sau"
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Sau
        </Button>
      </div>
    );
  }
  const first = totalElements && size ? page * size + 1 : 0;
  const last = totalElements && size ? Math.min(totalElements, (page + 1) * size) : 0;
  return (
    <div className="at-pagination">
      <div className="flex items-center gap-3">
        {totalElements !== undefined && (
          <span>
            {first && last ? `Hiển thị ${first}–${last} / ${totalElements}` : totalElements} kết quả
          </span>
        )}
        {onSize && (
          <label className="flex items-center gap-2">
            Số dòng
            <SelectInput
              aria-label="Số dòng mỗi trang"
              className="at-control w-auto"
              value={size}
              onChange={(e) => onSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </SelectInput>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          type="button"
          aria-label="Trang trước"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
          Trước
        </Button>
        <span>
          Trang {Math.min(page + 1, Math.max(1, totalPages))} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="ghost"
          type="button"
          aria-label="Trang sau"
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Sau
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="at-search">
      <Search size={18} aria-hidden />
      <TextInput type="search" {...props} />
    </div>
  );
}
export function Checkbox({
  label,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={`at-check ${className}`}>
      <input {...props} type="checkbox" data-ui="checkbox" />
      <span>{label}</span>
    </label>
  );
}
export function Radio({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="at-check">
      <input {...props} type="radio" data-ui="radio" />
      <span>{label}</span>
    </label>
  );
}

export function RadioCard({
  label,
  description,
  icon,
  ...props
}: ComponentProps<"input"> & { label: string; description: string; icon: ReactNode }) {
  return (
    <label className="at-choice">
      {icon}
      <span className="at-check">
        <input {...props} type="radio" data-ui="radio" />
        <span>{label}</span>
      </span>
      <small>{description}</small>
    </label>
  );
}
export function Avatar({ name, size = "normal" }: { name: string; size?: "normal" | "large" }) {
  return (
    <span className={`at-avatar ${size === "large" ? "at-avatar-large" : ""}`} aria-hidden>
      {name
        .split(" ")
        .slice(-2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
