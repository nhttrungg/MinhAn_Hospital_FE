"use client";
import { Dialog as RDialog, DropdownMenu, Tabs as RTabs, Tooltip as RTooltip } from "radix-ui";
import { useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { Button, Field, Notice, TextArea } from "./primitives";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  drawer = false,
  dirty = false,
  busy = false,
  size = "normal",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  drawer?: boolean;
  dirty?: boolean;
  busy?: boolean;
  size?: "normal" | "wide";
}) {
  const [discard, setDiscard] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  function change(value: boolean) {
    if (busy && !value) return;
    if (!value && dirty) {
      setDiscard(true);
      return;
    }
    setDiscard(false);
    onOpenChange(value);
  }
  return (
    <RDialog.Root open={open} onOpenChange={change}>
      <RDialog.Portal>
        <RDialog.Overlay className="at-overlay" />
        <RDialog.Content
          className={`${drawer ? "at-drawer" : "at-dialog"} ${size === "wide" ? "at-dialog-wide" : ""}`}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (busy) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <div className="at-dialog-heading">
            <div>
              <RDialog.Title>{title}</RDialog.Title>
              <RDialog.Description className={description ? "" : "sr-only"}>
                {description || "Xem thông tin và thực hiện thao tác."}
              </RDialog.Description>
            </div>
            <Button
              appearance="custom"
              type="button"
              className="at-icon-button"
              aria-label="Đóng"
              disabled={busy}
              onClick={() => change(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <div className="at-dialog-body">{children}</div>
          {footer && <div className="at-dialog-footer">{footer}</div>}
          {discard && (
            <div className="at-discard" role="alert">
              <h3>Bỏ thay đổi chưa lưu?</h3>
              <p>Thông tin bạn vừa nhập sẽ không được lưu.</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setDiscard(false)}>
                  Tiếp tục chỉnh sửa
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDiscard(false);
                    onOpenChange(false);
                  }}
                >
                  Bỏ thay đổi
                </Button>
              </div>
            </div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
export function Drawer(props: Omit<Parameters<typeof Dialog>[0], "drawer">) {
  return <Dialog {...props} drawer />;
}
export function DialogClose({ children }: { children: ReactNode }) {
  return <RDialog.Close asChild>{children}</RDialog.Close>;
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actionLabel,
  onConfirm,
  danger = false,
  reason = false,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  children?: ReactNode;
  actionLabel: string;
  onConfirm: (reason: string) => Promise<void>;
  danger?: boolean;
  reason?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onConfirm(text);
      setText("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      busy={busy}
      dirty={!!text}
      footer={
        <>
          <DialogClose>
            <Button type="button" variant="ghost" disabled={busy}>
              Quay lại
            </Button>
          </DialogClose>
          <Button
            variant={danger ? "danger" : "primary"}
            busy={busy}
            disabled={reason && !text.trim()}
            onClick={() => void submit()}
          >
            {actionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        {reason && (
          <Field label="Lý do" required>
            <TextArea
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập lý do để người liên quan biết và xử lý."
            />
          </Field>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Dialog>
  );
}
export function RowMenu({ children, label = "Thao tác" }: { children: ReactNode; label?: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="at-icon-button" aria-label={label}>
        <MoreHorizontal size={20} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="at-dropdown" sideOffset={6}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function MenuItem({
  children,
  onSelect,
  danger = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      className={`at-menu-item ${danger ? "text-danger" : ""}`}
      onSelect={onSelect}
    >
      {children}
    </DropdownMenu.Item>
  );
}
export function Tabs({
  value,
  onChange,
  items,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; content?: ReactNode }[];
  label?: string;
  children?: ReactNode;
}) {
  return (
    <RTabs.Root value={value} onValueChange={onChange}>
      <RTabs.List className="at-tabs" aria-label={label}>
        {items.map((i) => (
          <RTabs.Trigger value={i.value} key={i.value}>
            {i.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((i) => (
        <RTabs.Content className="at-tab-content space-y-5" key={i.value} value={i.value}>
          {i.content ?? (i.value === value ? children : null)}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={250}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content className="at-tooltip" sideOffset={5}>
            {label}
            <RTooltip.Arrow />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
