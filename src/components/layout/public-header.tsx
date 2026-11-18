"use client";
import { Disclosure } from "@/components/ui/disclosure";
import { ButtonLink, Button } from "@/components/ui/primitives";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "radix-ui";
import { useState } from "react";
import { CalendarDays, ChevronDown, Menu, Phone, ArrowUpRight, HeartPulse } from "lucide-react";
import { api } from "@/lib/api";
import { phoneHref, useClinic } from "@/lib/public-clinic";
import { Drawer } from "@/components/ui/overlays";
import { useQuery } from "@tanstack/react-query";
import { AccountMenu } from "./account-menu";
import type { Specialty } from "@/lib/types";

const customerLinks = [
  ["/booking", "Đặt lịch khám"],
  ["/portal", "Lịch hẹn của tôi"],
  ["/portal/records", "Kết quả khám"],
  ["/portal/invoices", "Hóa đơn và phiếu thu"],
  ["/faq", "Hướng dẫn và hỏi đáp"],
];
const aboutLinks = [
  ["/about", "Giới thiệu Minh An"],
  ["/contact", "Liên hệ cơ sở"],
];
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link prefetch={false} href="/" className="at-brand" aria-label="Minh An — Trang chủ">
      <Image
        src="/images/brand/minh-an-logo.png"
        alt="Logo Bệnh viện Minh An"
        width={44}
        height={44}
        className="at-brand-logo"
        unoptimized
        preload
      />
      <div>Minh An{!compact && <small>BỆNH VIỆN MINH AN</small>}</div>
    </Link>
  );
}
export function BrandRow({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const clinic = useClinic();
  return (
    <div className="at-brand-row">
      <div className="at-public-container">
        <Brand />
        <div className="at-header-contact">
          {clinic.data?.phone && (
            <a href={phoneHref(clinic.data.phone)}>
              <Phone size={18} />
              <span>
                <small>Liên hệ đặt khám</small>
                <strong>{clinic.data.phone}</strong>
              </span>
            </a>
          )}
        </div>
        <div className="at-header-actions">
          <div className="at-desktop-account">
            <AccountMenu />
          </div>
          <ButtonLink href="/booking" variant="primary">
            <CalendarDays size={18} />
            Đặt lịch khám
          </ButtonLink>
          <Button
            appearance="custom"
            className="at-mobile-menu at-icon-button"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={onMenu}
          >
            <Menu size={24} />
          </Button>
        </div>
      </div>
    </div>
  );
}
function MenuLinks({ items }: { items: string[][] }) {
  return (
    <div className="at-mega-links">
      {items.map(([href, label]) => (
        <NavigationMenu.Link asChild key={href}>
          <Link prefetch={false} href={href}>
            {label}
            <ArrowUpRight size={14} />
          </Link>
        </NavigationMenu.Link>
      ))}
    </div>
  );
}
export function SpecialtyMenu() {
  const specialties = useQuery({
    queryKey: ["specialties"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Specialty[]>("/api/v1/specialties", { signal }),
  });
  return (
    <>
      <p className="at-eyebrow">Tìm chăm sóc phù hợp</p>
      <MenuLinks items={(specialties.data ?? []).map((s) => [`/specialties/${s.id}`, s.name])} />
      <NavigationMenu.Link asChild>
        <Link prefetch={false} className="at-menu-all" href="/specialties">
          Xem tất cả chuyên khoa →
        </Link>
      </NavigationMenu.Link>
    </>
  );
}
export function CustomerMenu() {
  return (
    <>
      <p className="at-eyebrow">Đồng hành cùng bạn</p>
      <MenuLinks items={customerLinks} />
    </>
  );
}
export function PrimaryNavigation() {
  const path = usePathname();
  return (
    <div className="at-primary-row">
      <div className="at-public-container">
        <NavigationMenu.Root className="at-primary-nav" aria-label="Điều hướng chính">
          <NavigationMenu.List>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild active={path === "/"}>
                <Link prefetch={false} href="/">
                  Trang chủ
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger data-active={path.startsWith("/specialties")}>
                Chuyên khoa
                <ChevronDown size={14} />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="at-mega">
                <SpecialtyMenu />
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild active={path.startsWith("/doctors")}>
                <Link prefetch={false} href="/doctors">
                  Bác sĩ
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                data-active={
                  path.startsWith("/portal") ||
                  path === "/booking" ||
                  path === "/faq" ||
                  path.startsWith("/huong-dan")
                }
              >
                Dành cho khách hàng
                <ChevronDown size={14} />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="at-mega">
                <CustomerMenu />
              </NavigationMenu.Content>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger data-active={path === "/about" || path === "/contact"}>
                Về Minh An
                <ChevronDown size={14} />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="at-mega">
                <MenuLinks items={aboutLinks} />
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>
        <nav className="at-mobile-shortcuts" aria-label="Tiện ích khách hàng">
          <Link prefetch={false} href="/doctors">
            Tìm bác sĩ
          </Link>
          <Link prefetch={false} href="/portal">
            Lịch hẹn
          </Link>
          <AccountMenu compact />
        </nav>
      </div>
    </div>
  );
}
export function MobileNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Khám tại Minh An"
      description="Thông tin khám và tài khoản của bạn"
    >
      <nav
        className="at-mobile-navigation"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onClose();
        }}
      >
        <Link prefetch={false} href="/">
          Trang chủ
        </Link>
        <Link prefetch={false} href="/specialties">
          Chuyên khoa
        </Link>
        <Link prefetch={false} href="/doctors">
          Đội ngũ bác sĩ
        </Link>
        <Disclosure title={<>Dành cho khách hàng</>} open>
          {customerLinks.map(([href, label]) => (
            <Link prefetch={false} href={href} key={href}>
              {label}
            </Link>
          ))}
        </Disclosure>
        <Disclosure title={<>Về Minh An</>}>
          {aboutLinks.map(([href, label]) => (
            <Link prefetch={false} key={href} href={href}>
              {label}
            </Link>
          ))}
        </Disclosure>
        <Link prefetch={false} href="/login">
          Đăng nhập khách hàng
        </Link>
        <Link prefetch={false} href="/login/staff">
          Khu nhân viên
        </Link>
      </nav>
    </Drawer>
  );
}
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="public-site-header">
      <div className="at-care-topbar">
        <div className="at-public-container">
          <p>
            <HeartPulse size={14} aria-hidden /> Chăm sóc sức khỏe, bắt đầu từ sự an tâm.
          </p>
          <nav aria-label="Liên kết hỗ trợ">
            <Link prefetch={false} href="/huong-dan/huong-dan-khach-hang">
              Hướng dẫn đi khám
            </Link>
            <Link prefetch={false} href="/login/staff">
              Khu nhân viên <ArrowUpRight size={13} aria-hidden />
            </Link>
          </nav>
        </div>
      </div>
      <BrandRow menuOpen={open} onMenu={() => setOpen(true)} />
      <PrimaryNavigation />
      <MobileNavigation key={path} open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
