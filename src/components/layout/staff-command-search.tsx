"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight } from "lucide-react";
import type { CurrentUser } from "@/lib/types";
import { searchText } from "@/lib/public-clinic";
import { Button, Field, TextInput } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/data-display";
import { staffGroups } from "./staff-navigation";
export function StaffCommandSearch({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const results = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState(0);
  const items = staffGroups(user)
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
    .filter((item) => searchText(`${item.label} ${item.group}`).includes(searchText(term)));
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!event.repeat) {
          setOpen((value) => !value);
          setTerm("");
          setSelected(0);
        }
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    results.current
      ?.querySelector<HTMLElement>('[data-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [selected, open, term]);
  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }
  return (
    <>
      <Button
        variant="ghost"
        className="at-command-trigger"
        aria-label="Tìm nhanh chức năng"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          setTerm("");
          setSelected(0);
        }}
      >
        <Search size={17} aria-hidden />
        <span>Tìm chức năng</span>
        <kbd>⌘ / Ctrl K</kbd>
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tìm nhanh chức năng"
        description="Chỉ hiển thị chức năng thuộc quyền truy cập của bạn. Dùng phím ↑ ↓ và Enter để mở."
      >
        <div
          className="at-command"
          onKeyDown={(event) => {
            if (event.target instanceof HTMLInputElement) {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((value) =>
                  items.length
                    ? (value + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
                    : 0,
                );
              }
              if (event.key === "Enter" && items[selected]) {
                event.preventDefault();
                navigate(items[selected].href);
              }
            }
          }}
        >
          <Field label="Tên chức năng">
            <TextInput
              autoFocus
              type="search"
              value={term}
              placeholder="Ví dụ: tiếp nhận, thu phí, lịch bác sĩ…"
              onChange={(event) => {
                setTerm(event.target.value);
                setSelected(0);
              }}
            />
          </Field>
          <nav ref={results} className="at-command-results" aria-label="Kết quả tìm chức năng">
            {items.map((item, index) => (
              <Button
                key={item.href}
                appearance="custom"
                className="at-command-result"
                data-selected={index === selected}
                onClick={() => navigate(item.href)}
              >
                <item.icon size={20} aria-hidden />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.group}</small>
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </Button>
            ))}
            {!items.length && (
              <EmptyState
                title="Không có chức năng phù hợp"
                description="Thử tên khác hoặc chọn chức năng trong menu."
              />
            )}
          </nav>
        </div>
      </Dialog>
    </>
  );
}
